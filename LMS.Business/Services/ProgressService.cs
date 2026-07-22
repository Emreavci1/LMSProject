using LMS.Business.Common;
using LMS.DataAccess.Repositories;
using LMS.DTO.Lessons;
using LMS.Entities;

namespace LMS.Business.Services;

public class ProgressService : IProgressService
{
    private readonly ILessonCompletionRepository _completionRepository;
    private readonly ILessonRepository _lessonRepository;
    private readonly IEnrollmentRepository _enrollmentRepository;
    private readonly IExamAttemptRepository _attemptRepository;

    public ProgressService(
        ILessonCompletionRepository completionRepository,
        ILessonRepository lessonRepository,
        IEnrollmentRepository enrollmentRepository,
        IExamAttemptRepository attemptRepository)
    {
        _completionRepository = completionRepository;
        _lessonRepository = lessonRepository;
        _enrollmentRepository = enrollmentRepository;
        _attemptRepository = attemptRepository;
    }

    public async Task<ServiceResult<LessonCompletionStateDto>> ToggleAsync(int userId, int lessonId)
    {
        var lesson = await _lessonRepository.GetByIdAsync(lessonId);
        if (lesson is null)
            return ServiceResult<LessonCompletionStateDto>.Fail(ServiceErrorType.NotFound, "Ders bulunamadı.");

        // KAYIT KONTROLÜ: yalnızca kursa katılmış kullanıcı ders tamamlayabilir
        var enrollment = await _enrollmentRepository.GetByUserAndCourseAsync(userId, lesson.CourseId);
        if (enrollment is null)
            return ServiceResult<LessonCompletionStateDto>.Fail(ServiceErrorType.Forbidden, "Bu kursa kayıtlı değilsiniz.");

        // OTOMATİK BAŞARISIZ: zorunlu eğitimin son tarihi (saatli, kesin an) geçtiyse
        // artık ders tamamlanamaz (eğitim "Başarısız" sayılır; işaret kaldırma da kapalı).
        // Dialog varsayılanı 23:59 olduğundan yalnızca tarih seçen için gün sonu davranışı korunur.
        if (enrollment.IsAssigned && enrollment.DueDate.HasValue
            && DateTime.UtcNow >= enrollment.DueDate.Value)
        {
            return ServiceResult<LessonCompletionStateDto>.Fail(ServiceErrorType.Forbidden,
                "Bu zorunlu eğitimin süresi doldu; ders tamamlama işlemi yapılamaz.");
        }

        var existing = await _completionRepository.GetByUserAndLessonAsync(userId, lessonId);
        bool completed;

        if (existing is null)
        {
            // Tamamlandı olarak işaretle
            await _completionRepository.AddAsync(new LessonCompletion
            {
                UserId = userId,
                LessonId = lessonId,
                CompletedDate = DateTime.UtcNow
            });
            completed = true;
        }
        else
        {
            // İşareti geri al
            _completionRepository.Remove(existing);
            completed = false;
        }

        await _completionRepository.SaveChangesAsync();
        return ServiceResult<LessonCompletionStateDto>.Ok(new LessonCompletionStateDto
        {
            LessonId = lessonId,
            Completed = completed
        });
    }

    public Task<List<int>> GetMyCompletedLessonIdsAsync(int userId)
        => _completionRepository.GetLessonIdsByUserAsync(userId);

    public Task<List<int>> GetMySubmittedExamIdsAsync(int userId)
        => _attemptRepository.GetSubmittedExamIdsByUserAsync(userId);
}
