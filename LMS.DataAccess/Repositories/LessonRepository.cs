using LMS.Entities;
using Microsoft.EntityFrameworkCore;

namespace LMS.DataAccess.Repositories;

public class LessonRepository : Repository<Lesson>, ILessonRepository
{
    public LessonRepository(LmsDbContext context) : base(context)
    {
    }

    // Müfredat sırası: önce Order, eşitse ekleniş sırası (Id)
    public async Task<List<Lesson>> GetByCourseAsync(int courseId)
        => await _dbSet
            .Where(l => l.CourseId == courseId)
            .OrderBy(l => l.Order)
            .ThenBy(l => l.Id)
            .ToListAsync();

    // Birden çok kursun dersleri tek sorguda (sıralama önemsiz — ağırlık hesabı için)
    public async Task<List<Lesson>> GetByCoursesAsync(List<int> courseIds)
        => await _dbSet
            .Where(l => courseIds.Contains(l.CourseId))
            .ToListAsync();
}
