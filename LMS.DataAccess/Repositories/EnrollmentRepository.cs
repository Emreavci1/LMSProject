using LMS.Entities;
using Microsoft.EntityFrameworkCore;

namespace LMS.DataAccess.Repositories;

public class EnrollmentRepository : Repository<Enrollment>, IEnrollmentRepository
{
    public EnrollmentRepository(LmsDbContext context) : base(context)
    {
    }

    public async Task<bool> ExistsAsync(int userId, int courseId)
        => await _dbSet.AnyAsync(e => e.UserId == userId && e.CourseId == courseId);

    public async Task<List<Enrollment>> GetByUserWithCourseAsync(int userId)
        => await _dbSet
            .Include(e => e.Course)
                .ThenInclude(c => c.Instructor) // kursun eğitmenini de yükle
            .Where(e => e.UserId == userId)
            .OrderByDescending(e => e.EnrollDate)
            .ToListAsync();

    public async Task<List<Enrollment>> GetByCourseWithUserAsync(int courseId)
        => await _dbSet
            .Include(e => e.User)
            .Where(e => e.CourseId == courseId)
            .OrderByDescending(e => e.EnrollDate)
            .ToListAsync();
}
