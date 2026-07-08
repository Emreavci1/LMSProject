using AutoMapper;
using LMS.Business.Common;
using LMS.DataAccess.Repositories;
using LMS.DTO.Lessons;
using LMS.Entities;
using LMS.Entities.Enums;

namespace LMS.Business.Services;

public class LessonService : ILessonService
{
    private readonly ILessonRepository _lessonRepository;
    private readonly ICourseRepository _courseRepository;
    private readonly IMapper _mapper;

    public LessonService(
        ILessonRepository lessonRepository,
        ICourseRepository courseRepository,
        IMapper mapper)
    {
        _lessonRepository = lessonRepository;
        _courseRepository = courseRepository;
        _mapper = mapper;
    }

    public async Task<ServiceResult<List<LessonDto>>> GetByCourseAsync(int courseId)
    {
        var course = await _courseRepository.GetByIdAsync(courseId);
        if (course is null)
            return ServiceResult<List<LessonDto>>.Fail(ServiceErrorType.NotFound, "Kurs bulunamadı.");

        var lessons = await _lessonRepository.GetByCourseAsync(courseId);
        return ServiceResult<List<LessonDto>>.Ok(_mapper.Map<List<LessonDto>>(lessons));
    }

    public async Task<ServiceResult<LessonDto>> CreateAsync(int courseId, CreateLessonDto dto, int currentUserId, bool isAdmin)
    {
        // Kurs var mı + sahiplik kontrolü
        var (_, error) = await LoadOwnedCourseAsync(courseId, currentUserId, isAdmin);
        if (error is not null)
            return ServiceResult<LessonDto>.Fail(error.Value.Type, error.Value.Message);

        // İçerik tipi gönderilmezse/geçersizse Video kabul edilir
        var contentType = Enum.TryParse<LessonContentType>(dto.ContentType, out var parsed)
            ? parsed
            : LessonContentType.Video;

        // Yeni ders müfredatın sonuna eklenir
        var existing = await _lessonRepository.GetByCourseAsync(courseId);
        var nextOrder = existing.Count == 0 ? 0 : existing.Max(l => l.Order) + 1;

        var lesson = new Lesson
        {
            CourseId = courseId,
            Section = string.IsNullOrWhiteSpace(dto.Section) ? "Genel" : dto.Section.Trim(),
            Title = dto.Title.Trim(),
            Description = dto.Description,
            DurationMin = dto.DurationMin,
            ContentType = contentType,
            // Text için URL, diğerleri için metin anlamsız — ilgisiz alanı boş bırak
            ContentUrl = contentType == LessonContentType.Text ? null : dto.ContentUrl,
            TextContent = contentType == LessonContentType.Text ? dto.TextContent : null,
            Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim(),
            Order = nextOrder,
            CreatedDate = DateTime.UtcNow
        };

        await _lessonRepository.AddAsync(lesson);
        await _lessonRepository.SaveChangesAsync();

        // Not: CourseDto.LessonCount/DurationMinutes derslerden hesaplandığı için
        // kurs kaydını ayrıca güncellemeye gerek yok.
        return ServiceResult<LessonDto>.Ok(_mapper.Map<LessonDto>(lesson));
    }

    public async Task<ServiceResult> DeleteAsync(int courseId, int lessonId, int currentUserId, bool isAdmin)
    {
        var (_, error) = await LoadOwnedCourseAsync(courseId, currentUserId, isAdmin);
        if (error is not null)
            return ServiceResult.Fail(error.Value.Type, error.Value.Message);

        var lessons = await _lessonRepository.GetByCourseAsync(courseId);
        var lesson = lessons.FirstOrDefault(l => l.Id == lessonId);
        if (lesson is null)
            return ServiceResult.Fail(ServiceErrorType.NotFound, "Ders bulunamadı.");

        _lessonRepository.Remove(lesson);
        await _lessonRepository.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    public async Task<ServiceResult> ReorderAsync(int courseId, ReorderLessonsDto dto, int currentUserId, bool isAdmin)
    {
        var (_, error) = await LoadOwnedCourseAsync(courseId, currentUserId, isAdmin);
        if (error is not null)
            return ServiceResult.Fail(error.Value.Type, error.Value.Message);

        var lessons = await _lessonRepository.GetByCourseAsync(courseId);

        // Gönderilen id sırasına göre Order ata; listede olmayan dersler mevcut sırasını korur
        for (var i = 0; i < dto.LessonIds.Count; i++)
        {
            var lesson = lessons.FirstOrDefault(l => l.Id == dto.LessonIds[i]);
            if (lesson is null) continue;
            lesson.Order = i;
            _lessonRepository.Update(lesson);
        }

        await _lessonRepository.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    // Kursu yükler ve sahiplik kontrolü yapar.
    // Hata varsa (course=null, error=dolu); başarıda (course=kurs, error=null).
    private async Task<(Course? course, (ServiceErrorType Type, string Message)? error)> LoadOwnedCourseAsync(
        int courseId, int currentUserId, bool isAdmin)
    {
        var course = await _courseRepository.GetByIdAsync(courseId);
        if (course is null)
            return (null, (ServiceErrorType.NotFound, "Kurs bulunamadı."));

        // SAHİPLİK KONTROLÜ: Instructor yalnızca kendi kursunun derslerini yönetebilir
        if (!isAdmin && course.InstructorId != currentUserId)
            return (null, (ServiceErrorType.Forbidden, "Bu kurs üzerinde yetkiniz yok."));

        return (course, null);
    }
}
