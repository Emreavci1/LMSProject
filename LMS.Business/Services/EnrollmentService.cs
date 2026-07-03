using AutoMapper;
using LMS.Business.Common;
using LMS.DataAccess.Repositories;
using LMS.DTO.Enrollments;
using LMS.Entities;

namespace LMS.Business.Services;

public class EnrollmentService : IEnrollmentService
{
    private readonly IEnrollmentRepository _enrollmentRepository;
    private readonly ICourseRepository _courseRepository;
    private readonly IMapper _mapper;

    public EnrollmentService(
        IEnrollmentRepository enrollmentRepository,
        ICourseRepository courseRepository,
        IMapper mapper)
    {
        _enrollmentRepository = enrollmentRepository;
        _courseRepository = courseRepository;
        _mapper = mapper;
    }

    public async Task<ServiceResult<EnrollmentDto>> EnrollAsync(int userId, CreateEnrollmentDto dto)
    {
        // Kurs var mı ve aktif mi?
        var course = await _courseRepository.GetByIdWithInstructorAsync(dto.CourseId);
        if (course is null || !course.IsActive)
            return ServiceResult<EnrollmentDto>.Fail(ServiceErrorType.NotFound, "Kurs bulunamadı.");

        // Aynı kursa ikinci kez kayıt engellenir
        if (await _enrollmentRepository.ExistsAsync(userId, dto.CourseId))
            return ServiceResult<EnrollmentDto>.Fail(ServiceErrorType.Validation, "Bu kursa zaten katıldınız.");

        var enrollment = new Enrollment
        {
            UserId = userId,
            CourseId = dto.CourseId,
            EnrollDate = DateTime.UtcNow
        };

        await _enrollmentRepository.AddAsync(enrollment);
        await _enrollmentRepository.SaveChangesAsync();

        // DTO'daki CourseTitle/InstructorName alanları için course'u bağla
        enrollment.Course = course;
        return ServiceResult<EnrollmentDto>.Ok(_mapper.Map<EnrollmentDto>(enrollment));
    }

    public async Task<List<EnrollmentDto>> GetMyEnrollmentsAsync(int userId)
    {
        var enrollments = await _enrollmentRepository.GetByUserWithCourseAsync(userId);
        return _mapper.Map<List<EnrollmentDto>>(enrollments);
    }

    public async Task<ServiceResult<List<CourseAttendeeDto>>> GetCourseAttendeesAsync(int courseId, int currentUserId, bool isAdmin)
    {
        var course = await _courseRepository.GetByIdAsync(courseId);
        if (course is null)
            return ServiceResult<List<CourseAttendeeDto>>.Fail(ServiceErrorType.NotFound, "Kurs bulunamadı.");

        // SAHİPLİK KONTROLÜ: katılımcı listesini yalnızca kursun sahibi veya Admin görebilir
        if (!isAdmin && course.InstructorId != currentUserId)
            return ServiceResult<List<CourseAttendeeDto>>.Fail(ServiceErrorType.Forbidden, "Bu kursun katılımcılarını görme yetkiniz yok.");

        var enrollments = await _enrollmentRepository.GetByCourseWithUserAsync(courseId);
        return ServiceResult<List<CourseAttendeeDto>>.Ok(_mapper.Map<List<CourseAttendeeDto>>(enrollments));
    }
}
