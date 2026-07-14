using LMS.Business.Common;
using LMS.DTO.Announcements;
using LMS.Entities.Enums;

namespace LMS.Business.Services;

public interface IAnnouncementService
{
    // Öğrenci için: Kendi görebileceği (Genel + Kayıtlı olduğu kursların duyuruları)
    Task<ServiceResult<List<AnnouncementDto>>> GetMyAnnouncementsAsync(int userId);
    
    // Öğrenci için: Sadece o kursa ait duyurular (Örn: Eğitim detayı içinde)
    Task<ServiceResult<List<AnnouncementDto>>> GetCourseAnnouncementsAsync(int userId, UserRole role, int courseId);
    
    // Eğitmen/Admin için: Yönettikleri duyurular (Admin tümünü, eğitmen kendininkileri görür)
    Task<ServiceResult<List<AnnouncementDto>>> GetManagedAnnouncementsAsync(int userId, UserRole role);
    
    Task<ServiceResult<AnnouncementDto>> GetByIdAsync(int id);
    Task<ServiceResult<AnnouncementDto>> CreateAsync(int userId, UserRole role, CreateAnnouncementDto dto);
    Task<ServiceResult> UpdateAsync(int userId, UserRole role, int id, UpdateAnnouncementDto dto);
    Task<ServiceResult> DeleteAsync(int userId, UserRole role, int id);
}
