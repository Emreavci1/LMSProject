using AutoMapper;
using LMS.Business.Common;
using LMS.DataAccess.Repositories;
using LMS.DTO.Courses;
using LMS.Entities;
using LMS.Entities.Enums;

namespace LMS.Business.Services;

public class CourseService : ICourseService
{
    private readonly ICourseRepository _courseRepository;
    private readonly IEnrollmentRepository _enrollmentRepository;
    private readonly IMapper _mapper;

    public CourseService(
        ICourseRepository courseRepository,
        IEnrollmentRepository enrollmentRepository,
        IMapper mapper)
    {
        _courseRepository = courseRepository;
        _enrollmentRepository = enrollmentRepository;
        _mapper = mapper;
    }

    public async Task<List<CourseDto>> GetActiveCoursesAsync()
    {
        var courses = await _courseRepository.GetActiveWithInstructorAsync();
        return _mapper.Map<List<CourseDto>>(courses);
    }

    public async Task<ServiceResult<CourseDto>> GetByIdAsync(int id)
    {
        var course = await _courseRepository.GetByIdWithInstructorAsync(id);
        if (course is null || !course.IsActive)
            return ServiceResult<CourseDto>.Fail(ServiceErrorType.NotFound, "Kurs bulunamadı.");

        return ServiceResult<CourseDto>.Ok(_mapper.Map<CourseDto>(course));
    }

    public async Task<List<CourseDto>> GetMyCoursesAsync(int instructorId)
    {
        // Eğitmen kendi kurslarının tümünü görür (pasif olanlar dahil)
        var courses = await _courseRepository.GetByInstructorAsync(instructorId);
        return _mapper.Map<List<CourseDto>>(courses);
    }

    public async Task<ServiceResult<CourseDto>> CreateAsync(CreateCourseDto dto, int instructorId)
    {
        // Status gönderilmezse taslak; gelen metin geçersizse yine taslak
        var status = Enum.TryParse<CourseStatus>(dto.Status, out var parsed)
            ? parsed
            : CourseStatus.Draft;

        var course = new Course
        {
            Title = dto.Title,
            Description = dto.Description,
            CoverImageUrl = dto.CoverImageUrl,
            Category = dto.Category,
            Level = dto.Level,
            DurationHours = dto.DurationHours,
            LessonCount = dto.LessonCount,
            Status = status,
            PublishDate = dto.PublishDate,
            InstructorId = instructorId, // kurs, isteği yapan kullanıcıya atanır
            IsActive = true,
            CreatedDate = DateTime.UtcNow
        };

        await _courseRepository.AddAsync(course);
        await _courseRepository.SaveChangesAsync();

        // Instructor navigation'ını da içeren güncel halini dön
        var created = await _courseRepository.GetByIdWithInstructorAsync(course.Id);
        return ServiceResult<CourseDto>.Ok(_mapper.Map<CourseDto>(created));
    }

    public async Task<ServiceResult<CourseDto>> UpdateAsync(int id, UpdateCourseDto dto, int currentUserId, bool isAdmin)
    {
        var course = await _courseRepository.GetByIdWithInstructorAsync(id);
        if (course is null)
            return ServiceResult<CourseDto>.Fail(ServiceErrorType.NotFound, "Kurs bulunamadı.");

        // SAHİPLİK KONTROLÜ: rol kontrolü yeterli değil —
        // Instructor yalnızca KENDİ kursunu güncelleyebilir
        if (!isAdmin && course.InstructorId != currentUserId)
            return ServiceResult<CourseDto>.Fail(ServiceErrorType.Forbidden, "Bu kurs üzerinde yetkiniz yok.");

        course.Title = dto.Title;
        course.Description = dto.Description;
        course.CoverImageUrl = dto.CoverImageUrl;
        course.Category = dto.Category;
        course.Level = dto.Level;
        course.DurationHours = dto.DurationHours;
        course.LessonCount = dto.LessonCount;

        // Status gönderildiyse ve geçerliyse güncelle; aksi halde mevcut durum korunur
        if (!string.IsNullOrWhiteSpace(dto.Status) &&
            Enum.TryParse<CourseStatus>(dto.Status, out var parsed))
        {
            course.Status = parsed;
        }
        course.PublishDate = dto.PublishDate;

        // IsActive yalnızca gönderildiyse değişir (aktif/pasif toggle)
        if (dto.IsActive.HasValue)
            course.IsActive = dto.IsActive.Value;

        _courseRepository.Update(course);
        await _courseRepository.SaveChangesAsync();

        return ServiceResult<CourseDto>.Ok(_mapper.Map<CourseDto>(course));
    }

    public async Task<ServiceResult> DeleteAsync(int id, int currentUserId, bool isAdmin)
    {
        var course = await _courseRepository.GetByIdAsync(id);
        if (course is null)
            return ServiceResult.Fail(ServiceErrorType.NotFound, "Kurs bulunamadı.");

        // Sahiplik kontrolü (güncellemedekiyle aynı kural)
        if (!isAdmin && course.InstructorId != currentUserId)
            return ServiceResult.Fail(ServiceErrorType.Forbidden, "Bu kurs üzerinde yetkiniz yok.");

        // Kalıcı silme: FK kısıtı (Restrict) nedeniyle önce kursa ait kayıtları temizle
        var enrollments = await _enrollmentRepository.GetAllAsync(e => e.CourseId == id);
        if (enrollments.Count > 0)
            _enrollmentRepository.RemoveRange(enrollments);

        _courseRepository.Remove(course);
        await _courseRepository.SaveChangesAsync();

        return ServiceResult.Ok();
    }
}
