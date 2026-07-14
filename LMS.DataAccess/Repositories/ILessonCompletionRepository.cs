using LMS.Entities;

namespace LMS.DataAccess.Repositories;

// Ders tamamlama kayıtlarına özel sorgular
public interface ILessonCompletionRepository : IRepository<LessonCompletion>
{
    // Kullanıcının belirli bir ders için tamamlama kaydı (toggle için)
    Task<LessonCompletion?> GetByUserAndLessonAsync(int userId, int lessonId);

    // Kullanıcının tamamladığı TÜM derslerin id'leri (ilerleme hesabı frontend'de)
    Task<List<int>> GetLessonIdsByUserAsync(int userId);

    // Bir kurstaki tamamlama sayıları: kullanıcı id → tamamlanan ders sayısı
    // (eğitmenin katılımcı listesindeki ilerleme yüzdeleri için)
    Task<Dictionary<int, int>> GetCompletedCountsByCourseAsync(int courseId);

    // Bir kurstaki tamamlamalar: kullanıcı id → tamamlanan ders id'leri
    // (ders yükü ağırlıklı ilerleme hesabı için)
    Task<Dictionary<int, List<int>>> GetCompletedLessonIdsByCourseAsync(int courseId);

    // Birden çok kurstaki tamamlamalar TEK sorguda:
    // (kursId, kullanıcıId) → tamamlanan ders id'leri (admin raporu için)
    Task<Dictionary<(int CourseId, int UserId), List<int>>> GetCompletedLessonIdsByCoursesAsync(List<int> courseIds);
}
