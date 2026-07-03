using LMS.Business.Common;
using LMS.DTO.Enrollments;

namespace LMS.Business.Services;

public interface IEnrollmentService
{
    Task<ServiceResult<EnrollmentDto>> EnrollAsync(int userId, CreateEnrollmentDto dto);
    Task<List<EnrollmentDto>> GetMyEnrollmentsAsync(int userId);

    // Kursa katılanları yalnızca kursun sahibi Instructor veya Admin görebilir
    Task<ServiceResult<List<CourseAttendeeDto>>> GetCourseAttendeesAsync(int courseId, int currentUserId, bool isAdmin);
}
