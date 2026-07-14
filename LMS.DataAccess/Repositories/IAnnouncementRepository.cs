using LMS.Entities;

namespace LMS.DataAccess.Repositories;

public interface IAnnouncementRepository : IRepository<Announcement>
{
    // Özel sorgular gerekirse buraya eklenebilir. (Örn: yazar bazlı getirme)
    Task<List<Announcement>> GetMyAnnouncementsAsync(int userId, List<int> courseIds);
    Task<List<Announcement>> GetCourseAnnouncementsAsync(int courseId);
    Task<List<Announcement>> GetManagedAnnouncementsAsync(int authorId, bool isAdmin);
}
