using LMS.Business.Common;
using LMS.DTO.Enrollments;

namespace LMS.Business.Services;

public interface IEnrollmentService
{
    Task<ServiceResult<EnrollmentDto>> EnrollAsync(int userId, CreateEnrollmentDto dto);
    Task<List<EnrollmentDto>> GetMyEnrollmentsAsync(int userId);

    // Kayıtlı bir kurstan ayrıl (yalnızca kendi kaydını silebilir)
    Task<ServiceResult> UnenrollAsync(int userId, int courseId);

    // Kursa katılanları yalnızca kursun sahibi Instructor veya Admin görebilir
    Task<ServiceResult<List<CourseAttendeeDto>>> GetCourseAttendeesAsync(int courseId, int currentUserId, bool isAdmin);

    // Zorunlu eğitime katılımcı atama (yalnızca Admin çağırır — kontrol controller'da)
    Task<ServiceResult<EnrollmentDto>> AssignAsync(AssignEnrollmentDto dto);

    // Atamayı kaldır (yalnızca Admin). Katılım kaydı silinir,
    // tamamlama kayıtları (LessonCompletions) korunur.
    Task<ServiceResult> UnassignAsync(int courseId, int userId);

    // Admin kullanıcı detayı: bir kullanıcının tüm katılımları + ilerlemeleri
    Task<List<UserEnrollmentDto>> GetUserEnrollmentsForAdminAsync(int userId);

    // Admin zorunlu eğitim raporu: TÜM atamalar + ilerleme/gecikme durumları
    Task<List<AssignmentReportDto>> GetAssignmentReportAsync();
}
