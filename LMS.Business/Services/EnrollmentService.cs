using AutoMapper;
using LMS.Business.Common;
using LMS.DataAccess.Repositories;
using LMS.DTO.Enrollments;
using LMS.Entities;
using LMS.Entities.Enums;

namespace LMS.Business.Services;

public class EnrollmentService : IEnrollmentService
{
    private readonly IEnrollmentRepository _enrollmentRepository;
    private readonly ICourseRepository _courseRepository;
    private readonly ILessonRepository _lessonRepository;
    private readonly ILessonCompletionRepository _completionRepository;
    private readonly IUserRepository _userRepository;
    private readonly IMapper _mapper;

    public EnrollmentService(
        IEnrollmentRepository enrollmentRepository,
        ICourseRepository courseRepository,
        ILessonRepository lessonRepository,
        ILessonCompletionRepository completionRepository,
        IUserRepository userRepository,
        IMapper mapper)
    {
        _enrollmentRepository = enrollmentRepository;
        _courseRepository = courseRepository;
        _lessonRepository = lessonRepository;
        _completionRepository = completionRepository;
        _userRepository = userRepository;
        _mapper = mapper;
    }

    public async Task<ServiceResult<EnrollmentDto>> EnrollAsync(int userId, CreateEnrollmentDto dto)
    {
        // Kurs var mı ve aktif mi?
        var course = await _courseRepository.GetByIdWithInstructorAsync(dto.CourseId);
        if (course is null || !course.IsActive)
            return ServiceResult<EnrollmentDto>.Fail(ServiceErrorType.NotFound, "Kurs bulunamadı.");

        // Zorunlu eğitime kendi isteğiyle katılınamaz — yalnızca Admin atar
        if (course.IsMandatory)
            return ServiceResult<EnrollmentDto>.Fail(ServiceErrorType.Forbidden, "Bu eğitime katılım yalnızca atama ile yapılır.");

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

    public async Task<ServiceResult> UnenrollAsync(int userId, int courseId)
    {
        var enrollment = await _enrollmentRepository.GetByUserAndCourseAsync(userId, courseId);
        if (enrollment is null)
            return ServiceResult.Fail(ServiceErrorType.NotFound, "Bu kursa kayıtlı değilsiniz.");

        // Admin ataması (zorunlu eğitim) kaydından katılımcı kendi isteğiyle ayrılamaz
        if (enrollment.IsAssigned)
            return ServiceResult.Fail(ServiceErrorType.Forbidden, "Zorunlu eğitim kaydından ayrılamazsınız.");

        _enrollmentRepository.Remove(enrollment);
        await _enrollmentRepository.SaveChangesAsync();

        return ServiceResult.Ok();
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
        var attendees = _mapper.Map<List<CourseAttendeeDto>>(enrollments);

        // İlerleme yüzdesi: DERS YÜKÜ (kredi) ağırlıklı —
        // tamamlanan derslerin yük toplamı / kurstaki toplam yük
        var lessons = await _lessonRepository.GetByCourseAsync(courseId);
        var totalWeight = lessons.Sum(l => l.Weight);
        var weightById = lessons.ToDictionary(l => l.Id, l => l.Weight);
        var completedByUser = await _completionRepository.GetCompletedLessonIdsByCourseAsync(courseId);
        foreach (var attendee in attendees)
        {
            var completedWeight = completedByUser.GetValueOrDefault(attendee.UserId)
                ?.Sum(id => weightById.GetValueOrDefault(id)) ?? 0;
            attendee.Progress = totalWeight == 0
                ? 0
                : (int)Math.Round(completedWeight * 100.0 / totalWeight);

            // Gecikmiş/Başarısız: son tarih (artık saatli, kesin an) geçti ve eğitim %100 değil
            attendee.IsOverdue = attendee.DueDate.HasValue
                && DateTime.UtcNow >= attendee.DueDate.Value
                && attendee.Progress < 100;
        }

        return ServiceResult<List<CourseAttendeeDto>>.Ok(attendees);
    }

    public async Task<ServiceResult<EnrollmentDto>> AssignAsync(AssignEnrollmentDto dto)
    {
        var course = await _courseRepository.GetByIdWithInstructorAsync(dto.CourseId);
        if (course is null || !course.IsActive)
            return ServiceResult<EnrollmentDto>.Fail(ServiceErrorType.NotFound, "Kurs bulunamadı.");

        // Atanacak kişi: var, aktif ve katılımcı rolünde olmalı
        // (eğitmen/admin ders takip akışının dışında — onlara atama yapılmaz)
        var user = await _userRepository.GetByIdAsync(dto.UserId);
        if (user is null || !user.IsActive)
            return ServiceResult<EnrollmentDto>.Fail(ServiceErrorType.NotFound, "Kullanıcı bulunamadı.");
        if (user.Role != UserRole.CourseAttendee)
            return ServiceResult<EnrollmentDto>.Fail(ServiceErrorType.Validation, "Yalnızca katılımcı rolündeki kullanıcılar atanabilir.");

        var existing = await _enrollmentRepository.GetByUserAndCourseAsync(dto.UserId, dto.CourseId);
        if (existing is not null)
        {
            if (existing.IsAssigned)
                return ServiceResult<EnrollmentDto>.Fail(ServiceErrorType.Validation, "Bu kullanıcı bu eğitime zaten atanmış.");

            // Gönüllü katılmışsa kaydı atamaya çevir (ilerlemesi korunur)
            existing.IsAssigned = true;
            existing.DueDate = dto.DueDate;
            _enrollmentRepository.Update(existing);
            await _enrollmentRepository.SaveChangesAsync();

            existing.Course = course;
            return ServiceResult<EnrollmentDto>.Ok(_mapper.Map<EnrollmentDto>(existing));
        }

        var enrollment = new Enrollment
        {
            UserId = dto.UserId,
            CourseId = dto.CourseId,
            EnrollDate = DateTime.UtcNow,
            IsAssigned = true,
            DueDate = dto.DueDate
        };

        await _enrollmentRepository.AddAsync(enrollment);
        await _enrollmentRepository.SaveChangesAsync();

        enrollment.Course = course;
        return ServiceResult<EnrollmentDto>.Ok(_mapper.Map<EnrollmentDto>(enrollment));
    }

    public async Task<List<UserEnrollmentDto>> GetUserEnrollmentsForAdminAsync(int userId)
    {
        var enrollments = await _enrollmentRepository.GetByUserWithCourseAsync(userId);
        // Kullanıcının tamamladığı tüm dersler (tek sorgu) — kurs bazında kesişimle ilerleme hesaplanır
        var completedIds = (await _completionRepository.GetLessonIdsByUserAsync(userId)).ToHashSet();

        var result = new List<UserEnrollmentDto>();
        foreach (var enrollment in enrollments)
        {
            // Ders yükü (kredi) ağırlıklı ilerleme
            var lessons = await _lessonRepository.GetByCourseAsync(enrollment.CourseId);
            var totalWeight = lessons.Sum(l => l.Weight);
            var completedWeight = lessons.Where(l => completedIds.Contains(l.Id)).Sum(l => l.Weight);
            var progress = totalWeight == 0 ? 0 : (int)Math.Round(completedWeight * 100.0 / totalWeight);

            result.Add(new UserEnrollmentDto
            {
                CourseId = enrollment.CourseId,
                CourseTitle = enrollment.Course.Title,
                Category = enrollment.Course.Category,
                InstructorName = enrollment.Course.Instructor.FullName,
                EnrollDate = enrollment.EnrollDate,
                IsAssigned = enrollment.IsAssigned,
                DueDate = enrollment.DueDate,
                Progress = progress,
                IsOverdue = enrollment.IsAssigned
                    && enrollment.DueDate.HasValue
                    && DateTime.UtcNow >= enrollment.DueDate.Value
                    && progress < 100,
            });
        }
        return result;
    }

    public async Task<ServiceResult> UnassignAsync(int courseId, int userId)
    {
        var enrollment = await _enrollmentRepository.GetByUserAndCourseAsync(userId, courseId);
        if (enrollment is null || !enrollment.IsAssigned)
            return ServiceResult.Fail(ServiceErrorType.NotFound, "Atama kaydı bulunamadı.");

        // Katılım kaydı silinir; ders tamamlama kayıtları (LessonCompletions) durur —
        // kullanıcı ileride tekrar atanırsa ilerlemesi kaldığı yerden görünür
        _enrollmentRepository.Remove(enrollment);
        await _enrollmentRepository.SaveChangesAsync();

        return ServiceResult.Ok();
    }
}
