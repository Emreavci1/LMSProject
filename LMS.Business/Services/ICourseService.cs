using LMS.Business.Common;
using LMS.DTO.Courses;

namespace LMS.Business.Services;

public interface ICourseService
{
    Task<List<CourseDto>> GetActiveCoursesAsync();

    // TÜM kurslar (pasif/taslak dahil) — yalnızca Admin eğitim yönetimi kullanır
    Task<List<CourseDto>> GetAllCoursesAsync();

    // currentUserId + isAdmin: pasif kursun detayını yalnızca sahibi veya Admin görebilir
    Task<ServiceResult<CourseDto>> GetByIdAsync(int id, int currentUserId, bool isAdmin);
    Task<List<CourseDto>> GetMyCoursesAsync(int instructorId);
    Task<ServiceResult<CourseDto>> CreateAsync(CreateCourseDto dto, int instructorId);

    // currentUserId + isAdmin: sahiplik kontrolü için
    // (Instructor yalnızca kendi kursunu değiştirebilir, Admin hepsini)
    Task<ServiceResult<CourseDto>> UpdateAsync(int id, UpdateCourseDto dto, int currentUserId, bool isAdmin);

    // Kalıcı silme (hard delete). Aktif/Pasif için UpdateAsync + IsActive kullanılır.
    Task<ServiceResult> DeleteAsync(int id, int currentUserId, bool isAdmin);
}
