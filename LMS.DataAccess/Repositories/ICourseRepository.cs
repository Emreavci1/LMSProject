using LMS.Entities;

namespace LMS.DataAccess.Repositories;

// Course'a özel sorgular
public interface ICourseRepository : IRepository<Course>
{
    // Kursları eğitmen bilgisiyle birlikte getirir (InstructorName için gerekli).
    // userId: zorunlu kurslar herkese görünmez — yalnızca o kursa atanmış/kayıtlı kullanıcı görür
    Task<List<Course>> GetActiveWithInstructorAsync(int userId);
    // TÜM kurslar (pasif ve taslak dahil) — Admin eğitim yönetimi için
    Task<List<Course>> GetAllWithInstructorAsync();
    Task<Course?> GetByIdWithInstructorAsync(int id);
    Task<List<Course>> GetByInstructorAsync(int instructorId);

    // Yaklaşan eğitimler: zamanlanmış (Scheduled) + yayın tarihi belli olanlar.
    // userId: zorunlu olanlar yalnızca atanmışlara görünür (katalogla aynı kural)
    Task<List<Course>> GetUpcomingWithInstructorAsync(int userId);

    // Yayın tarihi gelmiş zamanlanmış kurslar (otomatik yayınlama servisi için)
    Task<List<Course>> GetDueScheduledAsync();
}
