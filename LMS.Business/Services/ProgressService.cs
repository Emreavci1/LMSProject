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

    public ProgressService(
        ILessonCompletionRepository completionRepository,
        ILessonRepository lessonRepository,
        IEnrollmentRepository enrollmentRepository)
    {
        _completionRepository = completionRepository;
        _lessonRepository = lessonRepository;
        _enrollmentRepository = enrollmentRepository;
    }

    public async Task<ServiceResult<LessonCompletionStateDto>> ToggleAsync(int userId, int lessonId)
    {
        var lesson = await _lessonRepository.GetByIdAsync(lessonId);
        if (lesson is null)
            return ServiceResult<LessonCompletionStateDto>.Fail(ServiceErrorType.NotFound, "Ders bulunamadı.");

        // KAYIT KONTROLÜ: yalnızca kursa katılmış kullanıcı ders tamamlayabilir
        if (!await _enrollmentRepository.ExistsAsync(userId, lesson.CourseId))
            return ServiceResult<LessonCompletionStateDto>.Fail(ServiceErrorType.Forbidden, "Bu kursa kayıtlı değilsiniz.");

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
}
