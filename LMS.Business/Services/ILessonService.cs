using LMS.Business.Common;
using LMS.DTO.Lessons;

namespace LMS.Business.Services;

public interface ILessonService
{
    // Bir kursun derslerini müfredat sırasıyla getirir (tüm giriş yapmış kullanıcılar)
    Task<ServiceResult<List<LessonDto>>> GetByCourseAsync(int courseId);

    // Aşağıdaki işlemler yalnızca kursun sahibi Instructor veya Admin tarafından yapılabilir
    // (currentUserId + isAdmin ile sahiplik kontrolü)
    Task<ServiceResult<LessonDto>> CreateAsync(int courseId, CreateLessonDto dto, int currentUserId, bool isAdmin);
    Task<ServiceResult<LessonDto>> UpdateAsync(int courseId, int lessonId, UpdateLessonDto dto, int currentUserId, bool isAdmin);
    Task<ServiceResult> DeleteAsync(int courseId, int lessonId, int currentUserId, bool isAdmin);
    Task<ServiceResult> ReorderAsync(int courseId, ReorderLessonsDto dto, int currentUserId, bool isAdmin);
}
