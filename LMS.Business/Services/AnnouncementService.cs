using AutoMapper;
using LMS.Business.Common;
using LMS.DataAccess.Repositories;
using LMS.DTO.Announcements;
using LMS.Entities;
using LMS.Entities.Enums;

namespace LMS.Business.Services;

public class AnnouncementService : IAnnouncementService
{
    private readonly IAnnouncementRepository _announcementRepository;
    private readonly IEnrollmentRepository _enrollmentRepository;
    private readonly ICourseRepository _courseRepository;
    private readonly IMapper _mapper;

    public AnnouncementService(
        IAnnouncementRepository announcementRepository,
        IEnrollmentRepository enrollmentRepository,
        ICourseRepository courseRepository,
        IMapper mapper)
    {
        _announcementRepository = announcementRepository;
        _enrollmentRepository = enrollmentRepository;
        _courseRepository = courseRepository;
        _mapper = mapper;
    }

    public async Task<ServiceResult<List<AnnouncementDto>>> GetMyAnnouncementsAsync(int userId)
    {
        var enrollments = await _enrollmentRepository.GetByUserWithCourseAsync(userId);
        var courseIds = enrollments.Select(e => e.CourseId).ToList();

        var announcements = await _announcementRepository.GetMyAnnouncementsAsync(userId, courseIds);
        return ServiceResult<List<AnnouncementDto>>.Ok(_mapper.Map<List<AnnouncementDto>>(announcements));
    }

    public async Task<ServiceResult<List<AnnouncementDto>>> GetCourseAnnouncementsAsync(int userId, UserRole role, int courseId)
    {
        if (role == UserRole.CourseAttendee)
        {
            var isEnrolled = await _enrollmentRepository.GetByUserAndCourseAsync(userId, courseId) != null;
            if (!isEnrolled)
                return ServiceResult<List<AnnouncementDto>>.Fail(ServiceErrorType.Forbidden, "Bu kursun duyurularını göremezsiniz.");
        }

        var announcements = await _announcementRepository.GetCourseAnnouncementsAsync(courseId);
        return ServiceResult<List<AnnouncementDto>>.Ok(_mapper.Map<List<AnnouncementDto>>(announcements));
    }

    public async Task<ServiceResult<List<AnnouncementDto>>> GetManagedAnnouncementsAsync(int userId, UserRole role)
    {
        if (role == UserRole.CourseAttendee)
            return ServiceResult<List<AnnouncementDto>>.Fail(ServiceErrorType.Forbidden, "Yetkiniz yok.");

        var announcements = await _announcementRepository.GetManagedAnnouncementsAsync(userId, role == UserRole.Admin);
        return ServiceResult<List<AnnouncementDto>>.Ok(_mapper.Map<List<AnnouncementDto>>(announcements));
    }

    public async Task<ServiceResult<AnnouncementDto>> GetByIdAsync(int id)
    {
        var announcement = await _announcementRepository.GetByIdAsync(id);
        if (announcement == null || !announcement.IsActive)
            return ServiceResult<AnnouncementDto>.Fail(ServiceErrorType.NotFound, "Duyuru bulunamadı.");

        return ServiceResult<AnnouncementDto>.Ok(_mapper.Map<AnnouncementDto>(announcement));
    }

    public async Task<ServiceResult<AnnouncementDto>> CreateAsync(int userId, UserRole role, CreateAnnouncementDto dto)
    {
        if (role == UserRole.CourseAttendee)
            return ServiceResult<AnnouncementDto>.Fail(ServiceErrorType.Forbidden, "Duyuru atma yetkiniz yok.");

        if (role == UserRole.Instructor && dto.CourseId.HasValue)
        {
            var course = await _courseRepository.GetByIdAsync(dto.CourseId.Value);
            if (course == null || course.InstructorId != userId)
                return ServiceResult<AnnouncementDto>.Fail(ServiceErrorType.Forbidden, "Sadece kendi kurslarınıza duyuru açabilirsiniz.");
        }

        var entity = new Announcement
        {
            Title = dto.Title,
            Content = dto.Content,
            CourseId = dto.CourseId,
            AuthorId = userId,
            PublishDate = dto.PublishDate ?? DateTime.UtcNow,
            ExpiryDate = dto.ExpiryDate,
            AttachmentUrl = dto.AttachmentUrl,
            AttachmentName = dto.AttachmentName
        };

        await _announcementRepository.AddAsync(entity);
        await _announcementRepository.SaveChangesAsync();

        var savedEntity = (await _announcementRepository.GetManagedAnnouncementsAsync(userId, true))
            .FirstOrDefault(a => a.Id == entity.Id);

        return ServiceResult<AnnouncementDto>.Ok(_mapper.Map<AnnouncementDto>(savedEntity ?? entity));
    }

    public async Task<ServiceResult> UpdateAsync(int userId, UserRole role, int id, UpdateAnnouncementDto dto)
    {
        var entity = await _announcementRepository.GetByIdAsync(id);
        if (entity == null || !entity.IsActive)
            return ServiceResult.Fail(ServiceErrorType.NotFound, "Duyuru bulunamadı.");

        if (role != UserRole.Admin && entity.AuthorId != userId)
            return ServiceResult.Fail(ServiceErrorType.Forbidden, "Başkasına ait duyuruyu güncelleyemezsiniz.");

        entity.Title = dto.Title;
        entity.Content = dto.Content;
        if (dto.PublishDate.HasValue) entity.PublishDate = dto.PublishDate.Value;
        entity.ExpiryDate = dto.ExpiryDate;
        entity.IsActive = dto.IsActive;
        entity.AttachmentUrl = dto.AttachmentUrl;
        entity.AttachmentName = dto.AttachmentName;

        _announcementRepository.Update(entity);
        await _announcementRepository.SaveChangesAsync();

        return ServiceResult.Ok();
    }

    public async Task<ServiceResult> DeleteAsync(int userId, UserRole role, int id)
    {
        var entity = await _announcementRepository.GetByIdAsync(id);
        if (entity == null || !entity.IsActive)
            return ServiceResult.Fail(ServiceErrorType.NotFound, "Duyuru bulunamadı.");

        if (role != UserRole.Admin && entity.AuthorId != userId)
            return ServiceResult.Fail(ServiceErrorType.Forbidden, "Başkasına ait duyuruyu silemezsiniz.");

        entity.IsActive = false;
        _announcementRepository.Update(entity);
        await _announcementRepository.SaveChangesAsync();

        return ServiceResult.Ok();
    }
}
