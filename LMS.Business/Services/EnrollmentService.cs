using AutoMapper;
using LMS.Business.Common;
using LMS.DataAccess.Repositories;
using LMS.DTO.Enrollments;
using LMS.Entities;
using LMS.Entities.Enums;

namespace LMS.Business.Services;

public class EnrollmentService : IEnrollmentService
{
    private readonly IEnrollmentRepository _enrollmentRepository;
    private readonly ICourseRepository _courseRepository;
    private readonly ILessonRepository _lessonRepository;
    private readonly ILessonCompletionRepository _completionRepository;
    private readonly IExamRepository _examRepository;
    private readonly IExamAttemptRepository _attemptRepository;
    private readonly IUserRepository _userRepository;
    private readonly IMapper _mapper;

    // İlerlemede her sınav bir "birim" (ders yüküyle aynı ölçek) sayılır.
    private const int ExamWeight = 1;

    public EnrollmentService(
        IEnrollmentRepository enrollmentRepository,
        ICourseRepository courseRepository,
        ILessonRepository lessonRepository,
        ILessonCompletionRepository completionRepository,
        IExamRepository examRepository,
        IExamAttemptRepository attemptRepository,
        IUserRepository userRepository,
        IMapper mapper)
    {
        _enrollmentRepository = enrollmentRepository;
        _courseRepository = courseRepository;
        _lessonRepository = lessonRepository;
        _completionRepository = completionRepository;
        _examRepository = examRepository;
        _attemptRepository = attemptRepository;
        _userRepository = userRepository;
        _mapper = mapper;
    }

    // Bir kullanıcının bir kurstaki sınav durumu özeti (rapor rozetleri için).
    // Son deneme geçerli: her sınav için en son gönderilen deneme dikkate alınır.
    // Geçti/kaldı yalnızca açık uçlu içeren sınavlarda anlamlıdır (MC-only otomatik tamamlanır).
    private static (int Total, int Submitted, int Pending, int Passed, int Failed) ComputeExamSummary(
        List<Entities.ExamAttempt> userAttempts,
        Dictionary<int, bool> hasOpenEndedByExam,
        int totalExams)
    {
        int submitted = 0, pending = 0, passed = 0, failed = 0;

        var latestPerExam = userAttempts
            .GroupBy(a => a.ExamId)
            .Select(g => g.OrderByDescending(a => a.SubmittedDate).First());

        foreach (var a in latestPerExam)
        {
            submitted++;
            // Geçti/kaldı yalnızca açık uçlu sınavda; MC-only "gönderildi = tamam"
            if (hasOpenEndedByExam.GetValueOrDefault(a.ExamId))
            {
                if (a.Status == Entities.Enums.ExamAttemptStatus.Evaluated)
                {
                    if (a.Passed == true) passed++;
                    else failed++;
                }
                else
                {
                    pending++; // gönderilmiş ama henüz değerlendirilmemiş
                }
            }
        }

        return (totalExams, submitted, pending, passed, failed);
    }

    public async Task<ServiceResult<EnrollmentDto>> EnrollAsync(int userId, CreateEnrollmentDto dto)
    {
        // Kurs var mı ve aktif mi?
        var course = await _courseRepository.GetByIdWithInstructorAsync(dto.CourseId);
        if (course is null || !course.IsActive)
            return ServiceResult<EnrollmentDto>.Fail(ServiceErrorType.NotFound, "Kurs bulunamadı.");

        // Zorunlu eğitime kendi isteğiyle katılınamaz — yalnızca Admin atar
        if (course.IsMandatory)
            return ServiceResult<EnrollmentDto>.Fail(ServiceErrorType.Forbidden, "Bu eğitime katılım yalnızca atama ile yapılır.");

        // Aynı kursa ikinci kez kayıt engellenir
        if (await _enrollmentRepository.ExistsAsync(userId, dto.CourseId))
            return ServiceResult<EnrollmentDto>.Fail(ServiceErrorType.Validation, "Bu kursa zaten katıldınız.");

        var enrollment = new Enrollment
        {
            UserId = userId,
            CourseId = dto.CourseId,
            EnrollDate = DateTime.UtcNow
        };

        await _enrollmentRepository.AddAsync(enrollment);
        await _enrollmentRepository.SaveChangesAsync();

        // DTO'daki CourseTitle/InstructorName alanları için course'u bağla
        enrollment.Course = course;
        return ServiceResult<EnrollmentDto>.Ok(_mapper.Map<EnrollmentDto>(enrollment));
    }

    public async Task<ServiceResult> UnenrollAsync(int userId, int courseId)
    {
        var enrollment = await _enrollmentRepository.GetByUserAndCourseAsync(userId, courseId);
        if (enrollment is null)
            return ServiceResult.Fail(ServiceErrorType.NotFound, "Bu kursa kayıtlı değilsiniz.");

        // Admin ataması (zorunlu eğitim) kaydından katılımcı kendi isteğiyle ayrılamaz
        if (enrollment.IsAssigned)
            return ServiceResult.Fail(ServiceErrorType.Forbidden, "Zorunlu eğitim kaydından ayrılamazsınız.");

        _enrollmentRepository.Remove(enrollment);
        await _enrollmentRepository.SaveChangesAsync();

        return ServiceResult.Ok();
    }

    public async Task<List<EnrollmentDto>> GetMyEnrollmentsAsync(int userId)
    {
        var enrollments = await _enrollmentRepository.GetByUserWithCourseAsync(userId);
        return _mapper.Map<List<EnrollmentDto>>(enrollments);
    }

    public async Task<ServiceResult<List<CourseAttendeeDto>>> GetCourseAttendeesAsync(int courseId, int currentUserId, bool isAdmin)
    {
        var course = await _courseRepository.GetByIdAsync(courseId);
        if (course is null)
            return ServiceResult<List<CourseAttendeeDto>>.Fail(ServiceErrorType.NotFound, "Kurs bulunamadı.");

        // SAHİPLİK KONTROLÜ: katılımcı listesini yalnızca kursun sahibi veya Admin görebilir
        if (!isAdmin && course.InstructorId != currentUserId)
            return ServiceResult<List<CourseAttendeeDto>>.Fail(ServiceErrorType.Forbidden, "Bu kursun katılımcılarını görme yetkiniz yok.");

        var enrollments = await _enrollmentRepository.GetByCourseWithUserAsync(courseId);
        var attendees = _mapper.Map<List<CourseAttendeeDto>>(enrollments);

        // İlerleme yüzdesi: DERS YÜKÜ (kredi) ağırlıklı + SINAVLAR (her biri 1 birim) —
        // (tamamlanan ders yükü + gönderilen sınav sayısı) / (toplam ders yükü + toplam sınav)
        var lessons = await _lessonRepository.GetByCourseAsync(courseId);
        var weightById = lessons.ToDictionary(l => l.Id, l => l.Weight);
        var completedByUser = await _completionRepository.GetCompletedLessonIdsByCourseAsync(courseId);

        // Sınavlar: toplam sınav = payda; gönderilenler = pay + geçti/kaldı/bekliyor özeti
        var exams = await _examRepository.GetByCourseAsync(courseId); // sorularıyla (açık uçlu ayrımı)
        var examCount = exams.Count;
        var hasOpenEndedByExam = exams.ToDictionary(e => e.Id, e => e.Questions.Any(q => q.Type == QuestionType.OpenEnded));
        var attemptsByUser = (await _attemptRepository.GetSubmittedByCourseAsync(courseId))
            .GroupBy(a => a.UserId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var totalWeight = lessons.Sum(l => l.Weight) + examCount * ExamWeight;
        foreach (var attendee in attendees)
        {
            var completedWeight = completedByUser.GetValueOrDefault(attendee.UserId)
                ?.Sum(id => weightById.GetValueOrDefault(id)) ?? 0;

            var summary = ComputeExamSummary(
                attemptsByUser.GetValueOrDefault(attendee.UserId) ?? [], hasOpenEndedByExam, examCount);
            attendee.ExamsTotal = summary.Total;
            attendee.ExamsSubmitted = summary.Submitted;
            attendee.ExamsPendingEval = summary.Pending;
            attendee.ExamsPassed = summary.Passed;
            attendee.ExamsFailed = summary.Failed;

            // Gönderilen sınavlar da ilerlemeye eklenir
            completedWeight += summary.Submitted * ExamWeight;
            attendee.Progress = totalWeight == 0
                ? 0
                : (int)Math.Round(completedWeight * 100.0 / totalWeight);

            // Gecikmiş/Başarısız: son tarih (artık saatli, kesin an) geçti ve eğitim %100 değil
            attendee.IsOverdue = attendee.DueDate.HasValue
                && DateTime.UtcNow >= attendee.DueDate.Value
                && attendee.Progress < 100;
        }

        return ServiceResult<List<CourseAttendeeDto>>.Ok(attendees);
    }

    public async Task<ServiceResult<EnrollmentDto>> AssignAsync(AssignEnrollmentDto dto)
    {
        var course = await _courseRepository.GetByIdWithInstructorAsync(dto.CourseId);
        if (course is null || !course.IsActive)
            return ServiceResult<EnrollmentDto>.Fail(ServiceErrorType.NotFound, "Kurs bulunamadı.");

        // Atanacak kişi: var, aktif ve katılımcı rolünde olmalı
        // (eğitmen/admin ders takip akışının dışında — onlara atama yapılmaz)
        var user = await _userRepository.GetByIdAsync(dto.UserId);
        if (user is null || !user.IsActive)
            return ServiceResult<EnrollmentDto>.Fail(ServiceErrorType.NotFound, "Kullanıcı bulunamadı.");
        if (user.Role != UserRole.CourseAttendee)
            return ServiceResult<EnrollmentDto>.Fail(ServiceErrorType.Validation, "Yalnızca katılımcı rolündeki kullanıcılar atanabilir.");

        var existing = await _enrollmentRepository.GetByUserAndCourseAsync(dto.UserId, dto.CourseId);
        if (existing is not null)
        {
            if (existing.IsAssigned)
                return ServiceResult<EnrollmentDto>.Fail(ServiceErrorType.Validation, "Bu kullanıcı bu eğitime zaten atanmış.");

            // Gönüllü katılmışsa kaydı atamaya çevir (ilerlemesi korunur)
            existing.IsAssigned = true;
            existing.DueDate = dto.DueDate;
            _enrollmentRepository.Update(existing);
            await _enrollmentRepository.SaveChangesAsync();

            existing.Course = course;
            return ServiceResult<EnrollmentDto>.Ok(_mapper.Map<EnrollmentDto>(existing));
        }

        var enrollment = new Enrollment
        {
            UserId = dto.UserId,
            CourseId = dto.CourseId,
            EnrollDate = DateTime.UtcNow,
            IsAssigned = true,
            DueDate = dto.DueDate
        };

        await _enrollmentRepository.AddAsync(enrollment);
        await _enrollmentRepository.SaveChangesAsync();

        enrollment.Course = course;
        return ServiceResult<EnrollmentDto>.Ok(_mapper.Map<EnrollmentDto>(enrollment));
    }

    public async Task<List<UserEnrollmentDto>> GetUserEnrollmentsForAdminAsync(int userId)
    {
        var enrollments = await _enrollmentRepository.GetByUserWithCourseAsync(userId);
        // Kullanıcının tamamladığı tüm dersler (tek sorgu) — kurs bazında kesişimle ilerleme hesaplanır
        var completedIds = (await _completionRepository.GetLessonIdsByUserAsync(userId)).ToHashSet();

        // Kullanıcının gönderdiği sınavlar + kurs başına sınavlar (ilerlemeye dahil)
        var submittedExamIds = (await _attemptRepository.GetSubmittedExamIdsByUserAsync(userId)).ToHashSet();
        var courseIds = enrollments.Select(e => e.CourseId).Distinct().ToList();
        var examsByCourse = (await _examRepository.GetByCoursesAsync(courseIds))
            .GroupBy(e => e.CourseId)
            .ToDictionary(g => g.Key, g => g.Select(e => e.Id).ToList());

        var result = new List<UserEnrollmentDto>();
        foreach (var enrollment in enrollments)
        {
            // Ders yükü (kredi) ağırlıklı ilerleme + sınavlar (her biri 1 birim)
            var lessons = await _lessonRepository.GetByCourseAsync(enrollment.CourseId);
            var examIds = examsByCourse.GetValueOrDefault(enrollment.CourseId) ?? [];
            var totalWeight = lessons.Sum(l => l.Weight) + examIds.Count * ExamWeight;
            var completedWeight = lessons.Where(l => completedIds.Contains(l.Id)).Sum(l => l.Weight)
                + examIds.Count(id => submittedExamIds.Contains(id)) * ExamWeight;
            var progress = totalWeight == 0 ? 0 : (int)Math.Round(completedWeight * 100.0 / totalWeight);

            result.Add(new UserEnrollmentDto
            {
                CourseId = enrollment.CourseId,
                CourseTitle = enrollment.Course.Title,
                Category = enrollment.Course.Category,
                InstructorName = enrollment.Course.Instructor.FullName,
                EnrollDate = enrollment.EnrollDate,
                IsAssigned = enrollment.IsAssigned,
                DueDate = enrollment.DueDate,
                Progress = progress,
                IsOverdue = enrollment.IsAssigned
                    && enrollment.DueDate.HasValue
                    && DateTime.UtcNow >= enrollment.DueDate.Value
                    && progress < 100,
            });
        }
        return result;
    }

    public async Task<List<AssignmentReportDto>> GetAssignmentReportAsync()
    {
        // SABİT 3 sorgu (kurs/katılımcı sayısından bağımsız):
        // atamalar + ilgili kursların dersleri + ilgili kursların tamamlamaları
        var assignments = await _enrollmentRepository.GetAssignedWithUserAndCourseAsync();
        if (assignments.Count == 0)
            return [];

        var courseIds = assignments.Select(e => e.CourseId).Distinct().ToList();
        var lessons = await _lessonRepository.GetByCoursesAsync(courseIds);
        var completed = await _completionRepository.GetCompletedLessonIdsByCoursesAsync(courseIds);

        // Sınavlar da ilerlemeye + rapora dahil: kurs başına sınav (soru tipiyle) + gönderilen denemeler
        var courseExams = await _examRepository.GetByCoursesWithQuestionsAsync(courseIds);
        var examCountByCourse = courseExams.GroupBy(e => e.CourseId).ToDictionary(g => g.Key, g => g.Count());
        var hasOpenEndedByExam = courseExams.ToDictionary(e => e.Id, e => e.Questions.Any(q => q.Type == QuestionType.OpenEnded));
        var examToCourse = courseExams.ToDictionary(e => e.Id, e => e.CourseId);
        // (kurs, kullanıcı) → o kursa ait gönderilmiş denemeler
        var attemptsByCourseUser = (await _attemptRepository.GetSubmittedByCoursesAsync(courseIds))
            .GroupBy(a => (Course: examToCourse.GetValueOrDefault(a.ExamId), a.UserId))
            .ToDictionary(g => g.Key, g => g.ToList());

        // Kurs başına toplam yük + ders id → yük tablosu (ders id'leri global benzersiz)
        var totalWeightByCourse = lessons
            .GroupBy(l => l.CourseId)
            .ToDictionary(g => g.Key, g => g.Sum(l => l.Weight));
        var weightById = lessons.ToDictionary(l => l.Id, l => l.Weight);

        var result = assignments.Select(enrollment =>
        {
            // Ders yükü (kredi) ağırlıklı + sınavlar (her biri 1 birim) — katılımcı raporuyla aynı kural
            var examCount = examCountByCourse.GetValueOrDefault(enrollment.CourseId);
            var summary = ComputeExamSummary(
                attemptsByCourseUser.GetValueOrDefault((enrollment.CourseId, enrollment.UserId)) ?? [],
                hasOpenEndedByExam, examCount);
            var totalWeight = totalWeightByCourse.GetValueOrDefault(enrollment.CourseId) + examCount * ExamWeight;
            var completedWeight = (completed.GetValueOrDefault((enrollment.CourseId, enrollment.UserId))
                ?.Sum(id => weightById.GetValueOrDefault(id)) ?? 0) + summary.Submitted * ExamWeight;
            var progress = totalWeight == 0 ? 0 : (int)Math.Round(completedWeight * 100.0 / totalWeight);

            return new AssignmentReportDto
            {
                UserId = enrollment.UserId,
                FullName = enrollment.User.FullName,
                Email = enrollment.User.Email,
                AvatarUrl = enrollment.User.AvatarUrl,
                CourseId = enrollment.CourseId,
                CourseTitle = enrollment.Course.Title,
                DueDate = enrollment.DueDate,
                Progress = progress,
                IsOverdue = enrollment.DueDate.HasValue
                    && DateTime.UtcNow >= enrollment.DueDate.Value
                    && progress < 100,
                ExamsTotal = summary.Total,
                ExamsSubmitted = summary.Submitted,
                ExamsPendingEval = summary.Pending,
                ExamsPassed = summary.Passed,
                ExamsFailed = summary.Failed,
            };
        })
        // Gecikenler en üstte, sonra en yakın son tarih
        .OrderByDescending(r => r.IsOverdue)
        .ThenBy(r => r.DueDate)
        .ToList();

        return result;
    }

    public async Task<ServiceResult> UnassignAsync(int courseId, int userId)
    {
        var enrollment = await _enrollmentRepository.GetByUserAndCourseAsync(userId, courseId);
        if (enrollment is null || !enrollment.IsAssigned)
            return ServiceResult.Fail(ServiceErrorType.NotFound, "Atama kaydı bulunamadı.");

        // Katılım kaydı silinir; ders tamamlama kayıtları (LessonCompletions) durur —
        // kullanıcı ileride tekrar atanırsa ilerlemesi kaldığı yerden görünür
        _enrollmentRepository.Remove(enrollment);
        await _enrollmentRepository.SaveChangesAsync();

        return ServiceResult.Ok();
    }
}
