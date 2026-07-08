using LMS.Entities;

namespace LMS.DataAccess.Repositories;

// Lesson'a özel sorgular
public interface ILessonRepository : IRepository<Lesson>
{
    // Bir kursun derslerini müfredat sırasına göre getirir
    Task<List<Lesson>> GetByCourseAsync(int courseId);
}
