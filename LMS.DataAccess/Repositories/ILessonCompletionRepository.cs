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
}
