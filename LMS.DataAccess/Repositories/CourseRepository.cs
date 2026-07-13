using LMS.Entities;
using LMS.Entities.Enums;
using Microsoft.EntityFrameworkCore;

namespace LMS.DataAccess.Repositories;

public class CourseRepository : Repository<Course>, ICourseRepository
{
    public CourseRepository(LmsDbContext context) : base(context)
    {
    }

    // Not: Dersleri de Include ediyoruz — CourseDto.LessonCount ve DurationMinutes
    // derslerden hesaplanır (mapping'de). Bu sayede sayılar her zaman güncel kalır.
    public async Task<List<Course>> GetActiveWithInstructorAsync(int userId)
        => await _dbSet
            .Include(c => c.Instructor)  // eğitmen bilgisini de yükle (JOIN)
            .Include(c => c.Lessons)     // ders sayısı/süresi hesabı için
            .Include(c => c.Enrollments) // katılımcı sayısı (StudentCount) için
            // Katılımcı kataloğu: yalnızca yayınlanmış kurslar görünür.
            // Taslak/zamanlanmış kurslar eğitmene özeldir (GET /api/courses/my)
            .Where(c => c.IsActive && c.Status == CourseStatus.Published)
            // Zorunlu kurslar katalogda gizli — yalnızca atanmış/kayıtlı kullanıcı görür
            // (dashboard/eğitimlerim bu listeden kurs bilgisi çektiği için kayıtlılar dahil edilir)
            .Where(c => !c.IsMandatory || c.Enrollments.Any(e => e.UserId == userId))
            .OrderByDescending(c => c.CreatedDate)
            .ToListAsync();

    public async Task<List<Course>> GetAllWithInstructorAsync()
        => await _dbSet
            .Include(c => c.Instructor)
            .Include(c => c.Lessons)
            .Include(c => c.Enrollments)
            // Admin tüm kursları görür: pasifler ve taslaklar dahil
            .OrderByDescending(c => c.CreatedDate)
            .ToListAsync();

    public async Task<Course?> GetByIdWithInstructorAsync(int id)
        => await _dbSet
            .Include(c => c.Instructor)
            .Include(c => c.Lessons)
            .Include(c => c.Enrollments)
            .FirstOrDefaultAsync(c => c.Id == id);

    public async Task<List<Course>> GetUpcomingWithInstructorAsync(int userId)
        => await _dbSet
            .Include(c => c.Instructor)
            .Include(c => c.Lessons)
            .Include(c => c.Enrollments)
            .Where(c => c.IsActive
                && c.Status == CourseStatus.Scheduled
                && c.PublishDate != null)
            // Zorunlu kurslar yine yalnızca atanmışlara görünür (katalog kuralıyla aynı)
            .Where(c => !c.IsMandatory || c.Enrollments.Any(e => e.UserId == userId))
            .OrderBy(c => c.PublishDate)
            .ToListAsync();

    public async Task<List<Course>> GetDueScheduledAsync()
        => await _dbSet
            // Yayın tarihi gelmiş/geçmiş zamanlanmış kurslar — otomatik yayınlanacaklar
            .Where(c => c.Status == CourseStatus.Scheduled
                && c.PublishDate != null
                && c.PublishDate <= DateTime.UtcNow)
            .ToListAsync();

    public async Task<List<Course>> GetByInstructorAsync(int instructorId)
        => await _dbSet
            .Include(c => c.Instructor)
            .Include(c => c.Lessons)
            .Include(c => c.Enrollments)
            .Where(c => c.InstructorId == instructorId)
            .OrderByDescending(c => c.CreatedDate)
            .ToListAsync();
}
