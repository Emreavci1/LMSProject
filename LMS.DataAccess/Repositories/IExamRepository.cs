using LMS.Entities;

namespace LMS.DataAccess.Repositories;

// Exam'e özel sorgular
public interface IExamRepository : IRepository<Exam>
{
    // Bir kursun sınavları — soruları Include eder (liste özetinde soru sayısı için).
    // Şıklar yüklenmez (liste ekranında gerekmez).
    Task<List<Exam>> GetByCourseAsync(int courseId);

    // Tek sınav — soruları ve şıklarıyla birlikte (düzenleme/gösterim için)
    Task<Exam?> GetByIdWithDetailsAsync(int examId);

    // İlerleme paydası için: birden çok kursun sınavları (yalnızca Id + CourseId, Include yok)
    Task<List<Exam>> GetByCoursesAsync(List<int> courseIds);

    // Rapor için: birden çok kursun sınavları soru tipleriyle (açık uçlu ayrımı için)
    Task<List<Exam>> GetByCoursesWithQuestionsAsync(List<int> courseIds);
}
