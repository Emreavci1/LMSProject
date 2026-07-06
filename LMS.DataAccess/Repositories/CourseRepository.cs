using LMS.Entities;
using LMS.Entities.Enums;
using Microsoft.EntityFrameworkCore;

namespace LMS.DataAccess.Repositories;

public class CourseRepository : Repository<Course>, ICourseRepository
{
    public CourseRepository(LmsDbContext context) : base(context)
    {
    }

    public async Task<List<Course>> GetActiveWithInstructorAsync()
        => await _dbSet
            .Include(c => c.Instructor) // eğitmen bilgisini de yükle (JOIN)
            // Katılımcı kataloğu: yalnızca yayınlanmış kurslar görünür.
            // Taslak/zamanlanmış kurslar eğitmene özeldir (GET /api/courses/my)
            .Where(c => c.IsActive && c.Status == CourseStatus.Published)
            .OrderByDescending(c => c.CreatedDate)
            .ToListAsync();

    public async Task<Course?> GetByIdWithInstructorAsync(int id)
        => await _dbSet
            .Include(c => c.Instructor)
            .FirstOrDefaultAsync(c => c.Id == id);

    public async Task<List<Course>> GetByInstructorAsync(int instructorId)
        => await _dbSet
            .Include(c => c.Instructor)
            .Where(c => c.InstructorId == instructorId)
            .OrderByDescending(c => c.CreatedDate)
            .ToListAsync();
}
