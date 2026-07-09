using LMS.Entities;

namespace LMS.DataAccess.Repositories;

// Course'a özel sorgular
public interface ICourseRepository : IRepository<Course>
{
    // Kursları eğitmen bilgisiyle birlikte getirir (InstructorName için gerekli)
    Task<List<Course>> GetActiveWithInstructorAsync();
    // TÜM kurslar (pasif ve taslak dahil) — Admin eğitim yönetimi için
    Task<List<Course>> GetAllWithInstructorAsync();
    Task<Course?> GetByIdWithInstructorAsync(int id);
    Task<List<Course>> GetByInstructorAsync(int instructorId);
}
