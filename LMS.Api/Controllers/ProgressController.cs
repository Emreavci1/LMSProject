using LMS.Business.Services;
using LMS.DTO.Lessons;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LMS.Api.Controllers;

// Katılımcının ders tamamlama (ilerleme) uç noktaları
[ApiController]
[Route("api/progress")]
[Authorize]
public class ProgressController : ApiControllerBase
{
    private readonly IProgressService _progressService;

    public ProgressController(IProgressService progressService)
    {
        _progressService = progressService;
    }

    // POST /api/progress/lessons/{lessonId}/toggle — dersi tamamla / işareti geri al
    // (yalnızca katılımcılar; kursa kayıt kontrolü service'te)
    [HttpPost("lessons/{lessonId:int}/toggle")]
    [Authorize(Roles = "CourseAttendee")]
    public async Task<ActionResult<LessonCompletionStateDto>> Toggle(int lessonId)
    {
        var result = await _progressService.ToggleAsync(CurrentUserId, lessonId);
        if (!result.Success)
            return ToErrorResponse(result);

        return Ok(result.Data);
    }

    // GET /api/progress/my — kullanıcının tamamladığı derslerin id listesi
    [HttpGet("my")]
    public async Task<ActionResult<List<int>>> GetMyCompletions()
        => Ok(await _progressService.GetMyCompletedLessonIdsAsync(CurrentUserId));
}
