using LMS.Business.Services;
using LMS.DTO.Enrollments;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LMS.Api.Controllers;

[ApiController]
[Route("api/enrollments")]
[Authorize]
public class EnrollmentController : ApiControllerBase
{
    private readonly IEnrollmentService _enrollmentService;

    public EnrollmentController(IEnrollmentService enrollmentService)
    {
        _enrollmentService = enrollmentService;
    }

    // POST /api/enrollments — kursa katıl (yalnızca katılımcılar)
    [HttpPost]
    [Authorize(Roles = "CourseAttendee")]
    public async Task<ActionResult<EnrollmentDto>> Enroll([FromBody] CreateEnrollmentDto dto)
    {
        // UserId token'dan alınır — kimse başkası adına kayıt yapamaz
        var result = await _enrollmentService.EnrollAsync(CurrentUserId, dto);
        if (!result.Success)
            return ToErrorResponse(result);

        return CreatedAtAction(nameof(GetMyEnrollments), result.Data);
    }

    // DELETE /api/enrollments/{courseId} — kayıtlı kurstan ayrıl (yalnızca katılımcılar)
    [HttpDelete("{courseId:int}")]
    [Authorize(Roles = "CourseAttendee")]
    public async Task<ActionResult> Unenroll(int courseId)
    {
        var result = await _enrollmentService.UnenrollAsync(CurrentUserId, courseId);
        if (!result.Success)
            return ToErrorResponse(result);

        return NoContent();
    }

    // POST /api/enrollments/assign — zorunlu eğitime katılımcı ata (yalnızca Admin)
    [HttpPost("assign")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<EnrollmentDto>> Assign([FromBody] AssignEnrollmentDto dto)
    {
        var result = await _enrollmentService.AssignAsync(dto);
        if (!result.Success)
            return ToErrorResponse(result);

        return CreatedAtAction(nameof(GetCourseAttendees), new { courseId = dto.CourseId }, result.Data);
    }

    // DELETE /api/enrollments/assign/{courseId}/{userId} — atamayı kaldır (yalnızca Admin)
    [HttpDelete("assign/{courseId:int}/{userId:int}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> Unassign(int courseId, int userId)
    {
        var result = await _enrollmentService.UnassignAsync(courseId, userId);
        if (!result.Success)
            return ToErrorResponse(result);

        return NoContent();
    }

    // GET /api/enrollments/my — kendi katıldığım kurslar
    [HttpGet("my")]
    public async Task<ActionResult<List<EnrollmentDto>>> GetMyEnrollments()
        => Ok(await _enrollmentService.GetMyEnrollmentsAsync(CurrentUserId));

    // GET /api/enrollments/course/{courseId} — kursa katılanlar
    // (yalnızca kursun sahibi Instructor veya Admin)
    [HttpGet("course/{courseId:int}")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<ActionResult<List<CourseAttendeeDto>>> GetCourseAttendees(int courseId)
    {
        var result = await _enrollmentService.GetCourseAttendeesAsync(courseId, CurrentUserId, IsAdmin);
        if (!result.Success)
            return ToErrorResponse(result);

        return Ok(result.Data);
    }
}
