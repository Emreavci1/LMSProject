using LMS.Entities;

namespace LMS.DataAccess.Repositories;

// Lesson'a özel sorgular
public interface ILessonRepository : IRepository<Lesson>
{
    // Bir kursun derslerini müfredat sırasına göre getirir
    Task<List<Lesson>> GetByCourseAsync(int courseId);

    // Birden çok kursun dersleri TEK sorguda (rapor hesapları — kurs başına sorgu atılmaz)
    Task<List<Lesson>> GetByCoursesAsync(List<int> courseIds);
}
