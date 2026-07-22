using LMS.Business.Common;
using LMS.DataAccess.Repositories;
using LMS.DTO.Exams;
using LMS.Entities;
using LMS.Entities.Enums;

namespace LMS.Business.Services;

public class ExamAttemptService : IExamAttemptService
{
    private readonly IExamRepository _examRepository;
    private readonly IExamAttemptRepository _attemptRepository;
    private readonly ILessonRepository _lessonRepository;
    private readonly ILessonCompletionRepository _completionRepository;
    private readonly IEnrollmentRepository _enrollmentRepository;

    public ExamAttemptService(
        IExamRepository examRepository,
        IExamAttemptRepository attemptRepository,
        ILessonRepository lessonRepository,
        ILessonCompletionRepository completionRepository,
        IEnrollmentRepository enrollmentRepository)
    {
        _examRepository = examRepository;
        _attemptRepository = attemptRepository;
        _lessonRepository = lessonRepository;
        _completionRepository = completionRepository;
        _enrollmentRepository = enrollmentRepository;
    }

    public async Task<ServiceResult<StudentExamDto>> GetStudentExamAsync(int examId, int userId)
    {
        var exam = await _examRepository.GetByIdWithDetailsAsync(examId);
        if (exam is null)
            return ServiceResult<StudentExamDto>.Fail(ServiceErrorType.NotFound, "Sınav bulunamadı.");

        // KAYIT KONTROLÜ: sınava yalnızca kursa kayıtlı öğrenci erişebilir
        var enrollment = await _enrollmentRepository.GetByUserAndCourseAsync(userId, exam.CourseId);
        if (enrollment is null)
            return ServiceResult<StudentExamDto>.Fail(ServiceErrorType.Forbidden, "Bu kursa kayıtlı değilsiniz.");

        // Süresi dolmuş devam eden süreli deneme varsa önce otomatik gönder (lazy)
        await AutoSubmitIfExpiredAsync(exam, userId);

        var (unlocked, done, total) = await ComputeLockAsync(userId, exam.CourseId);

        var attempts = await _attemptRepository.GetByUserAndExamAsync(userId, examId);
        var submitted = attempts.Where(a => a.Status != ExamAttemptStatus.InProgress)
                                .OrderBy(a => a.SubmittedDate)
                                .ToList();
        var active = await _attemptRepository.GetActiveWithAnswersAsync(userId, examId);

        var dto = new StudentExamDto
        {
            Id = exam.Id,
            CourseId = exam.CourseId,
            Title = exam.Title,
            Description = exam.Description,
            TimeLimitMin = exam.TimeLimitMin,
            MaxAttempts = exam.MaxAttempts,
            Questions = MapStudentQuestions(exam),
            IsUnlocked = unlocked,
            LockReason = unlocked ? null : "Bu sınav, kursun tüm dersleri tamamlanınca açılır.",
            LessonsCompleted = done,
            LessonsTotal = total,
            AttemptsUsed = submitted.Count,
            CanStartNew = unlocked && active is null && submitted.Count < exam.MaxAttempts,
            ActiveAttempt = active is null ? null : MapActiveAttempt(exam, active),
            // "Son deneme geçerli": en son gönderilen denemenin sonucu
            LastResult = submitted.Count == 0 ? null : MapResult(exam, submitted[^1]),
        };

        return ServiceResult<StudentExamDto>.Ok(dto);
    }

    public async Task<ServiceResult<StudentAttemptDto>> StartAttemptAsync(int examId, int userId)
    {
        var exam = await _examRepository.GetByIdWithDetailsAsync(examId);
        if (exam is null)
            return ServiceResult<StudentAttemptDto>.Fail(ServiceErrorType.NotFound, "Sınav bulunamadı.");

        var enrollment = await _enrollmentRepository.GetByUserAndCourseAsync(userId, exam.CourseId);
        if (enrollment is null)
            return ServiceResult<StudentAttemptDto>.Fail(ServiceErrorType.Forbidden, "Bu kursa kayıtlı değilsiniz.");

        await AutoSubmitIfExpiredAsync(exam, userId);

        var (unlocked, _, _) = await ComputeLockAsync(userId, exam.CourseId);
        if (!unlocked)
            return ServiceResult<StudentAttemptDto>.Fail(ServiceErrorType.Forbidden,
                "Sınav kilitli: önce kursun tüm derslerini tamamlayın.");

        // Devam eden deneme varsa yenisini açma, onu döndür (resume)
        var active = await _attemptRepository.GetActiveWithAnswersAsync(userId, examId);
        if (active is not null)
            return ServiceResult<StudentAttemptDto>.Ok(MapActiveAttempt(exam, active));

        // Deneme hakkı: gönderilmiş deneme sayısı MaxAttempts'ten az olmalı
        var attempts = await _attemptRepository.GetByUserAndExamAsync(userId, examId);
        var used = attempts.Count(a => a.Status != ExamAttemptStatus.InProgress);
        if (used >= exam.MaxAttempts)
            return ServiceResult<StudentAttemptDto>.Fail(ServiceErrorType.Forbidden,
                "Bu sınav için deneme hakkınız doldu.");

        var attempt = new ExamAttempt
        {
            ExamId = examId,
            UserId = userId,
            Status = ExamAttemptStatus.InProgress,
            StartedDate = DateTime.UtcNow,
        };
        await _attemptRepository.AddAsync(attempt);
        await _attemptRepository.SaveChangesAsync();

        return ServiceResult<StudentAttemptDto>.Ok(MapActiveAttempt(exam, attempt));
    }

    public async Task<ServiceResult<StudentAttemptDto>> SaveAnswersAsync(int examId, int attemptId, SaveAnswersDto dto, int userId)
    {
        var (attempt, exam, error) = await LoadOwnedInProgressAsync(examId, attemptId, userId);
        if (error is not null)
            return ServiceResult<StudentAttemptDto>.Fail(error.Value.Type, error.Value.Message);

        // Süre dolduysa: kaydetme, kayıtlı cevaplarla otomatik gönder
        if (IsExpired(exam!, attempt!))
        {
            Finalize(exam!, attempt!);
            _attemptRepository.Update(attempt!);
            await _attemptRepository.SaveChangesAsync();
            return ServiceResult<StudentAttemptDto>.Fail(ServiceErrorType.Validation,
                "Süre doldu; sınav kayıtlı cevaplarla otomatik gönderildi.");
        }

        ReplaceAnswers(attempt!, exam!, dto.Answers);
        _attemptRepository.Update(attempt!);
        await _attemptRepository.SaveChangesAsync();

        return ServiceResult<StudentAttemptDto>.Ok(MapActiveAttempt(exam!, attempt!));
    }

    public async Task<ServiceResult<StudentResultDto>> SubmitAttemptAsync(int examId, int attemptId, SaveAnswersDto dto, int userId)
    {
        var (attempt, exam, error) = await LoadOwnedInProgressAsync(examId, attemptId, userId);
        if (error is not null)
            return ServiceResult<StudentResultDto>.Fail(error.Value.Type, error.Value.Message);

        // Süre dolmadıysa gönderilen cevapları son hali olarak kaydet;
        // dolduysa yeni cevapları yok say, kayıtlı olanlarla gönder.
        if (!IsExpired(exam!, attempt!))
            ReplaceAnswers(attempt!, exam!, dto.Answers);

        Finalize(exam!, attempt!);
        _attemptRepository.Update(attempt!);
        await _attemptRepository.SaveChangesAsync();

        return ServiceResult<StudentResultDto>.Ok(MapResult(exam!, attempt!));
    }

    // --- Yardımcılar ---

    // Denemeyi + sınavı yükler, sahiplik ve "devam ediyor" durumunu doğrular
    private async Task<(ExamAttempt? attempt, Exam? exam, (ServiceErrorType Type, string Message)? error)>
        LoadOwnedInProgressAsync(int examId, int attemptId, int userId)
    {
        var attempt = await _attemptRepository.GetByIdWithAnswersAsync(attemptId);
        if (attempt is null || attempt.ExamId != examId || attempt.UserId != userId)
            return (null, null, (ServiceErrorType.NotFound, "Deneme bulunamadı."));

        if (attempt.Status != ExamAttemptStatus.InProgress)
            return (null, null, (ServiceErrorType.Validation, "Bu deneme zaten gönderilmiş."));

        var exam = await _examRepository.GetByIdWithDetailsAsync(examId);
        if (exam is null)
            return (null, null, (ServiceErrorType.NotFound, "Sınav bulunamadı."));

        return (attempt, exam, null);
    }

    // Kilit: kursun tüm dersleri tamamlandı mı? (ders yoksa açık)
    private async Task<(bool unlocked, int done, int total)> ComputeLockAsync(int userId, int courseId)
    {
        var lessons = await _lessonRepository.GetByCourseAsync(courseId);
        var total = lessons.Count;
        if (total == 0) return (true, 0, 0);

        var completed = (await _completionRepository.GetLessonIdsByUserAsync(userId)).ToHashSet();
        var done = lessons.Count(l => completed.Contains(l.Id));
        return (done == total, done, total);
    }

    private static bool IsExpired(Exam exam, ExamAttempt attempt)
        => exam.TimeLimitMin is int limit
           && DateTime.UtcNow >= attempt.StartedDate.AddMinutes(limit);

    // Süresi dolmuş devam eden süreli denemeyi kayıtlı cevaplarla otomatik gönder
    private async Task AutoSubmitIfExpiredAsync(Exam exam, int userId)
    {
        if (exam.TimeLimitMin is null) return; // süresiz: resume serbest
        var active = await _attemptRepository.GetActiveWithAnswersAsync(userId, exam.Id);
        if (active is null || !IsExpired(exam, active)) return;

        Finalize(exam, active);
        _attemptRepository.Update(active);
        await _attemptRepository.SaveChangesAsync();
    }

    // Denemenin cevaplarını gönderilenlerle değiştirir (taslak kaydetme).
    // Yalnızca sınava ait sorular; MC'de yalnızca o sorunun şıkkı geçerli sayılır.
    private static void ReplaceAnswers(ExamAttempt attempt, Exam exam, List<StudentAnswerDto> answers)
    {
        var questions = exam.Questions.ToDictionary(q => q.Id);

        attempt.Answers.Clear(); // takip edilen eski cevaplar silinir (cascade)
        foreach (var a in answers)
        {
            if (!questions.TryGetValue(a.QuestionId, out var q)) continue;

            int? selected = null;
            string? text = null;
            if (q.Type == QuestionType.MultipleChoice)
            {
                // Seçilen şık gerçekten bu soruya ait mi? (aksi halde boş sayılır)
                if (a.SelectedOptionId is int optId && q.Options.Any(o => o.Id == optId))
                    selected = optId;
            }
            else // OpenEnded
            {
                text = string.IsNullOrWhiteSpace(a.TextAnswer) ? null : a.TextAnswer.Trim();
            }

            attempt.Answers.Add(new ExamAnswer
            {
                QuestionId = a.QuestionId,
                SelectedOptionId = selected,
                TextAnswer = text,
                CreditPercent = null, // puan gönderimde hesaplanır
            });
        }
    }

    // Denemeyi kesinleştir: her soruya cevap satırı garanti et, MC'leri otomatik puanla,
    // açık uçlu yoksa nihai puanı hesapla (varsa değerlendirme bekler → Score null).
    private static void Finalize(Exam exam, ExamAttempt attempt)
    {
        foreach (var q in exam.Questions)
        {
            var ans = attempt.Answers.FirstOrDefault(x => x.QuestionId == q.Id);

            if (q.Type == QuestionType.MultipleChoice)
            {
                var credit = 0;
                if (ans?.SelectedOptionId is int sel)
                {
                    var opt = q.Options.FirstOrDefault(o => o.Id == sel);
                    if (opt is not null && opt.IsCorrect) credit = 100;
                }

                if (ans is null)
                    attempt.Answers.Add(new ExamAnswer { QuestionId = q.Id, CreditPercent = credit });
                else
                    ans.CreditPercent = credit;
            }
            else // OpenEnded: elle puanlanacak (Faz 4) → CreditPercent null kalır
            {
                if (ans is null)
                    attempt.Answers.Add(new ExamAnswer { QuestionId = q.Id, CreditPercent = null });
            }
        }

        attempt.Status = ExamAttemptStatus.Submitted;
        attempt.SubmittedDate = DateTime.UtcNow;

        var hasOpenEnded = exam.Questions.Any(q => q.Type == QuestionType.OpenEnded);
        if (!hasOpenEnded && exam.Questions.Count > 0)
        {
            // Tümü çoktan seçmeli: nihai puan = kredilerin ortalaması.
            // 0.5 durumları yukarı yuvarlanır (AwayFromZero) — frontend önizlemesiyle
            // (JS Math.round) aynı olsun ve "68.5 → 69" sezgisiyle uyumlu olsun.
            var credits = exam.Questions
                .Select(q => attempt.Answers.First(a => a.QuestionId == q.Id).CreditPercent ?? 0);
            attempt.Score = (int)Math.Round(credits.Average(), MidpointRounding.AwayFromZero);
        }
        else
        {
            attempt.Score = null; // açık uçlu var → değerlendirme sonrası kesinleşir
        }
    }

    private static List<StudentQuestionDto> MapStudentQuestions(Exam exam)
        => exam.Questions
            .OrderBy(q => q.Order).ThenBy(q => q.Id)
            .Select(q => new StudentQuestionDto
            {
                Id = q.Id,
                Type = q.Type.ToString(),
                Text = q.Text,
                Order = q.Order,
                Options = q.Options
                    .OrderBy(o => o.Order).ThenBy(o => o.Id)
                    .Select(o => new StudentOptionDto { Id = o.Id, Text = o.Text, Order = o.Order })
                    .ToList(),
            })
            .ToList();

    private static StudentAttemptDto MapActiveAttempt(Exam exam, ExamAttempt attempt)
    {
        DateTime? deadline = exam.TimeLimitMin is int limit
            ? attempt.StartedDate.AddMinutes(limit)
            : null;
        int? remaining = deadline is DateTime d
            ? Math.Max(0, (int)(d - DateTime.UtcNow).TotalSeconds)
            : null;

        return new StudentAttemptDto
        {
            Id = attempt.Id,
            StartedDate = attempt.StartedDate,
            Deadline = deadline,
            RemainingSeconds = remaining,
            Answers = attempt.Answers.Select(a => new StudentAnswerDto
            {
                QuestionId = a.QuestionId,
                SelectedOptionId = a.SelectedOptionId,
                TextAnswer = a.TextAnswer,
            }).ToList(),
        };
    }

    private static StudentResultDto MapResult(Exam exam, ExamAttempt attempt)
    {
        var hasOpenEnded = exam.Questions.Any(q => q.Type == QuestionType.OpenEnded);
        var pending = attempt.Status == ExamAttemptStatus.Submitted && hasOpenEnded && attempt.Score is null;

        return new StudentResultDto
        {
            AttemptId = attempt.Id,
            Status = attempt.Status.ToString(),
            SubmittedDate = attempt.SubmittedDate,
            Score = attempt.Score,
            Pending = pending,
            Passed = attempt.Passed,
        };
    }
}
