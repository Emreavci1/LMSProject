using System.Security.Claims;
using LMS.Business.Services;
using LMS.DTO.Announcements;
using LMS.Entities.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LMS.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class AnnouncementsController : ApiControllerBase
{
    private readonly IAnnouncementService _announcementService;

    public AnnouncementsController(IAnnouncementService announcementService)
    {
        _announcementService = announcementService;
    }

    private UserRole CurrentUserRole 
        => Enum.Parse<UserRole>(User.FindFirstValue(ClaimTypes.Role)!);

    [HttpGet("my")]
    public async Task<IActionResult> GetMyAnnouncements()
    {
        var result = await _announcementService.GetMyAnnouncementsAsync(CurrentUserId);
        return result.Success ? Ok(result.Data) : ToErrorResponse(result);
    }

    [HttpGet("course/{courseId}")]
    public async Task<IActionResult> GetCourseAnnouncements(int courseId)
    {
        var result = await _announcementService.GetCourseAnnouncementsAsync(CurrentUserId, CurrentUserRole, courseId);
        return result.Success ? Ok(result.Data) : ToErrorResponse(result);
    }

    [HttpGet("managed")]
    public async Task<IActionResult> GetManagedAnnouncements()
    {
        var result = await _announcementService.GetManagedAnnouncementsAsync(CurrentUserId, CurrentUserRole);
        return result.Success ? Ok(result.Data) : ToErrorResponse(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAnnouncementDto dto)
    {
        var result = await _announcementService.CreateAsync(CurrentUserId, CurrentUserRole, dto);
        return result.Success ? Created("", result.Data) : ToErrorResponse(result);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateAnnouncementDto dto)
    {
        var result = await _announcementService.UpdateAsync(CurrentUserId, CurrentUserRole, id, dto);
        return result.Success ? NoContent() : ToErrorResponse(result);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await _announcementService.DeleteAsync(CurrentUserId, CurrentUserRole, id);
        return result.Success ? NoContent() : ToErrorResponse(result);
    }
}
