using LMS.Entities;
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
            .Where(c => c.IsActive)
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
