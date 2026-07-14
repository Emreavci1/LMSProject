using LMS.Entities;
using Microsoft.EntityFrameworkCore;

namespace LMS.DataAccess.Repositories;

public class AnnouncementRepository : Repository<Announcement>, IAnnouncementRepository
{
    public AnnouncementRepository(LmsDbContext context) : base(context)
    {
    }

    public async Task<List<Announcement>> GetMyAnnouncementsAsync(int userId, List<int> courseIds)
    {
        var now = DateTime.UtcNow;
        return await _dbSet
            .Include(a => a.Author)
            // Yayınlanmış + süresi dolmamış (ExpiryDate null ise süresiz)
            .Where(a => a.IsActive && a.PublishDate <= now &&
                        (a.ExpiryDate == null || a.ExpiryDate > now) &&
                        (a.CourseId == null || courseIds.Contains(a.CourseId.Value)))
            .OrderByDescending(a => a.PublishDate)
            .ToListAsync();
    }

    public async Task<List<Announcement>> GetCourseAnnouncementsAsync(int courseId)
    {
        var now = DateTime.UtcNow;
        return await _dbSet
            .Include(a => a.Author)
            .Where(a => a.IsActive && a.PublishDate <= now &&
                        (a.ExpiryDate == null || a.ExpiryDate > now) && a.CourseId == courseId)
            .OrderByDescending(a => a.PublishDate)
            .ToListAsync();
    }

    public async Task<List<Announcement>> GetManagedAnnouncementsAsync(int authorId, bool isAdmin)
    {
        var query = _dbSet
            .Include(a => a.Author)
            .Include(a => a.Course)
            .Where(a => a.IsActive);
            
        // Admin tüm duyuruları görebilir, Eğitmen sadece kendi attıklarını
        if (!isAdmin)
        {
            query = query.Where(a => a.AuthorId == authorId);
        }

        return await query.OrderByDescending(a => a.PublishDate).ToListAsync();
    }
}
