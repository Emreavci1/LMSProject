using LMS.Business.Common;
using LMS.DataAccess.Repositories;
using LMS.DTO.Exams;
using LMS.Entities;
using LMS.Entities.Enums;

namespace LMS.Business.Services;

public class ExamEvaluationService : IExamEvaluationService
{
    private readonly IExamRepository _examRepository;
    private readonly IExamAttemptRepository _attemptRepository;
    private readonly ICourseRepository _courseRepository;

    public ExamEvaluationService(
        IExamRepository examRepository,
        IExamAttemptRepository attemptRepository,
        ICourseRepository courseRepository)
    {
        _examRepository = examRepository;
        _attemptRepository = attemptRepository;
        _courseRepository = courseRepository;
    }

    public async Task<ServiceResult<List<ExamAttemptListItemDto>>> GetAttemptsAsync(int courseId, int examId, int currentUserId, bool isAdmin)
    {
        var (exam, error) = await LoadOwnedExamAsync(courseId, examId, currentUserId, isAdmin);
        if (error is not null)
            return ServiceResult<List<ExamAttemptListItemDto>>.Fail(error.Value.Type, error.Value.Message);

        var hasOpenEnded = exam!.Questions.Any(q => q.Type == QuestionType.OpenEnded);

        var attempts = await _attemptRepository.GetSubmittedByExamWithUserAsync(examId);
        // Son deneme geçerli: her öğrencinin en son gönderilen denemesi
        var latestPerUser = attempts
            .GroupBy(a => a.UserId)
            .Select(g => g.OrderByDescending(a => a.SubmittedDate).First())
            .OrderBy(a => a.User.FullName)
            .Select(a => new ExamAttemptListItemDto
            {
                AttemptId = a.Id,
                UserId = a.UserId,
                StudentName = a.User.FullName,
                StudentEmail = a.User.Email,
                SubmittedDate = a.SubmittedDate,
                Status = a.Status.ToString(),
                Score = a.Score,
                Passed = a.Passed,
                // Değerlendirme yalnızca açık uçlu sınavlarda ve henüz Evaluated değilse gerekir
                NeedsEvaluation = hasOpenEnded && a.Status == ExamAttemptStatus.Submitted,
            })
            .ToList();

        return ServiceResult<List<ExamAttemptListItemDto>>.Ok(latestPerUser);
    }

    public async Task<ServiceResult<ExamAttemptDetailDto>> GetAttemptDetailAsync(int courseId, int examId, int attemptId, int currentUserId, bool isAdmin)
    {
        var (exam, error) = await LoadOwnedExamAsync(courseId, examId, currentUserId, isAdmin);
        if (error is not null)
            return ServiceResult<ExamAttemptDetailDto>.Fail(error.Value.Type, error.Value.Message);

        var attempt = await _attemptRepository.GetByIdWithAnswersAndUserAsync(attemptId);
        if (attempt is null || attempt.ExamId != examId)
            return ServiceResult<ExamAttemptDetailDto>.Fail(ServiceErrorType.NotFound, "Deneme bulunamadı.");

        return ServiceResult<ExamAttemptDetailDto>.Ok(BuildDetail(exam!, attempt));
    }

    public async Task<ServiceResult<ExamAttemptDetailDto>> EvaluateAsync(int courseId, int examId, int attemptId, EvaluateAttemptDto dto, int currentUserId, bool isAdmin)
    {
        var (exam, error) = await LoadOwnedExamAsync(courseId, examId, currentUserId, isAdmin);
        if (error is not null)
            return ServiceResult<ExamAttemptDetailDto>.Fail(error.Value.Type, error.Value.Message);

        var hasOpenEnded = exam!.Questions.Any(q => q.Type == QuestionType.OpenEnded);
        if (!hasOpenEnded)
            return ServiceResult<ExamAttemptDetailDto>.Fail(ServiceErrorType.Validation,
                "Bu sınav yalnızca çoktan seçmeli sorulardan oluşuyor; değerlendirme gerektirmez.");

        var attempt = await _attemptRepository.GetByIdWithAnswersAsync(attemptId);
        if (attempt is null || attempt.ExamId != examId)
            return ServiceResult<ExamAttemptDetailDto>.Fail(ServiceErrorType.NotFound, "Deneme bulunamadı.");

        if (attempt.Status == ExamAttemptStatus.InProgress)
            return ServiceResult<ExamAttemptDetailDto>.Fail(ServiceErrorType.Validation, "Bu deneme henüz gönderilmemiş.");

        // Açık uçlu soruların kredilerini uygula (yalnızca sınavın açık uçlu soruları)
        var openEndedIds = exam.Questions
            .Where(q => q.Type == QuestionType.OpenEnded)
            .Select(q => q.Id)
            .ToHashSet();
        var creditByQuestion = dto.Credits
            .Where(c => openEndedIds.Contains(c.QuestionId))
            .ToDictionary(c => c.QuestionId, c => Math.Clamp(c.CreditPercent, 0, 100));

        foreach (var answer in attempt.Answers)
        {
            if (openEndedIds.Contains(answer.QuestionId))
                // Kredi verilmişse onu, verilmemişse 0 (değerlendirilmemiş açık uçlu = 0)
                answer.CreditPercent = creditByQuestion.GetValueOrDefault(answer.QuestionId, 0);
        }

        // Nihai puan = tüm soruların kredi ortalaması (MC otomatik + açık uçlu elle).
        // 0.5 yukarı yuvarlanır (AwayFromZero) — frontend önizlemesiyle tutarlı olsun.
        var credits = exam.Questions
            .Select(q => attempt.Answers.FirstOrDefault(a => a.QuestionId == q.Id)?.CreditPercent ?? 0);
        attempt.Score = (int)Math.Round(credits.Average(), MidpointRounding.AwayFromZero);
        attempt.Status = ExamAttemptStatus.Evaluated;
        attempt.Passed = dto.Passed;
        attempt.EvaluatedById = currentUserId;
        attempt.EvaluatedDate = DateTime.UtcNow;

        _attemptRepository.Update(attempt);
        await _attemptRepository.SaveChangesAsync();

        // Öğrenci bilgisiyle yeniden yükleyip detay dön
        var saved = await _attemptRepository.GetByIdWithAnswersAndUserAsync(attemptId);
        return ServiceResult<ExamAttemptDetailDto>.Ok(BuildDetail(exam, saved!));
    }

    // --- Yardımcılar ---

    private ExamAttemptDetailDto BuildDetail(Exam exam, ExamAttempt attempt)
    {
        var answersByQuestion = attempt.Answers.ToDictionary(a => a.QuestionId);

        var answers = exam.Questions
            .OrderBy(q => q.Order).ThenBy(q => q.Id)
            .Select(q =>
            {
                answersByQuestion.TryGetValue(q.Id, out var ans);
                return new EvalAnswerDto
                {
                    QuestionId = q.Id,
                    Type = q.Type.ToString(),
                    QuestionText = q.Text,
                    Order = q.Order,
                    Options = q.Type == QuestionType.MultipleChoice
                        ? q.Options.OrderBy(o => o.Order).ThenBy(o => o.Id)
                            .Select(o => new EvalOptionDto { Id = o.Id, Text = o.Text, IsCorrect = o.IsCorrect, Order = o.Order })
                            .ToList()
                        : new List<EvalOptionDto>(),
                    SelectedOptionId = ans?.SelectedOptionId,
                    TextAnswer = ans?.TextAnswer,
                    CreditPercent = ans?.CreditPercent,
                };
            })
            .ToList();

        return new ExamAttemptDetailDto
        {
            AttemptId = attempt.Id,
            UserId = attempt.UserId,
            StudentName = attempt.User.FullName,
            StudentEmail = attempt.User.Email,
            SubmittedDate = attempt.SubmittedDate,
            Status = attempt.Status.ToString(),
            Score = attempt.Score,
            Passed = attempt.Passed,
            HasOpenEnded = exam.Questions.Any(q => q.Type == QuestionType.OpenEnded),
            Answers = answers,
        };
    }

    // Sınavı yükler + kurs sahipliğini doğrular (LessonService/ExamService ile aynı desen)
    private async Task<(Exam? exam, (ServiceErrorType Type, string Message)? error)> LoadOwnedExamAsync(
        int courseId, int examId, int currentUserId, bool isAdmin)
    {
        var course = await _courseRepository.GetByIdAsync(courseId);
        if (course is null)
            return (null, (ServiceErrorType.NotFound, "Kurs bulunamadı."));

        if (!isAdmin && course.InstructorId != currentUserId)
            return (null, (ServiceErrorType.Forbidden, "Bu kurs üzerinde yetkiniz yok."));

        var exam = await _examRepository.GetByIdWithDetailsAsync(examId);
        if (exam is null || exam.CourseId != courseId)
            return (null, (ServiceErrorType.NotFound, "Sınav bulunamadı."));

        return (exam, null);
    }
}
