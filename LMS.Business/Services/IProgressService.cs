using LMS.Business.Common;
using LMS.DTO.Lessons;

namespace LMS.Business.Services;

// Katılımcının ders tamamlama (ilerleme) işlemleri
public interface IProgressService
{
    // Dersi tamamlandı/tamamlanmadı olarak işaretle (toggle).
    // Yalnızca derse ait kursa kayıtlı katılımcı yapabilir.
    Task<ServiceResult<LessonCompletionStateDto>> ToggleAsync(int userId, int lessonId);

    // Kullanıcının tamamladığı tüm derslerin id listesi
    Task<List<int>> GetMyCompletedLessonIdsAsync(int userId);
}
