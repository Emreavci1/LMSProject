using LMS.Entities;

namespace LMS.DataAccess.Repositories;

// Enrollment'a özel sorgular
public interface IEnrollmentRepository : IRepository<Enrollment>
{
    // Kullanıcı bu kursa zaten kayıtlı mı?
    Task<bool> ExistsAsync(int userId, int courseId);

    // Kullanıcının katıldığı kurslar (kurs + eğitmen bilgisiyle)
    Task<List<Enrollment>> GetByUserWithCourseAsync(int userId);

    // Bir kursa katılanlar (kullanıcı bilgisiyle)
    Task<List<Enrollment>> GetByCourseWithUserAsync(int courseId);
}
