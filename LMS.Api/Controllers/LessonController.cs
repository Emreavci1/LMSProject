using LMS.Business.Services;
using LMS.DTO.Lessons;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LMS.Api.Controllers;

// Dersler bir kursa bağlıdır: route /api/courses/{courseId}/lessons
[ApiController]
[Route("api/courses/{courseId:int}/lessons")]
[Authorize] // tüm endpoint'ler giriş gerektirir
public class LessonController : ApiControllerBase
{
    private readonly ILessonService _lessonService;

    public LessonController(ILessonService lessonService)
    {
        _lessonService = lessonService;
    }

    // GET /api/courses/{courseId}/lessons — müfredat (tüm giriş yapmış kullanıcılar)
    [HttpGet]
    public async Task<ActionResult<List<LessonDto>>> GetByCourse(int courseId)
    {
        var result = await _lessonService.GetByCourseAsync(courseId);
        if (!result.Success)
            return ToErrorResponse(result);

        return Ok(result.Data);
    }

    // POST /api/courses/{courseId}/lessons — ders ekle (yalnızca sahibi Instructor veya Admin)
    [HttpPost]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<ActionResult<LessonDto>> Create(int courseId, [FromBody] CreateLessonDto dto)
    {
        // Sahiplik kontrolü service'te yapılır (rol kontrolü tek başına yeterli değil)
        var result = await _lessonService.CreateAsync(courseId, dto, CurrentUserId, IsAdmin);
        if (!result.Success)
            return ToErrorResponse(result);

        return CreatedAtAction(nameof(GetByCourse), new { courseId }, result.Data);
    }

    // DELETE /api/courses/{courseId}/lessons/{lessonId} — ders sil (yalnızca sahibi Instructor veya Admin)
    [HttpDelete("{lessonId:int}")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<ActionResult> Delete(int courseId, int lessonId)
    {
        var result = await _lessonService.DeleteAsync(courseId, lessonId, CurrentUserId, IsAdmin);
        if (!result.Success)
            return ToErrorResponse(result);

        return NoContent();
    }

    // POST /api/courses/{courseId}/lessons/reorder — müfredat sırasını güncelle
    [HttpPost("reorder")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<ActionResult> Reorder(int courseId, [FromBody] ReorderLessonsDto dto)
    {
        var result = await _lessonService.ReorderAsync(courseId, dto, CurrentUserId, IsAdmin);
        if (!result.Success)
            return ToErrorResponse(result);

        return NoContent();
    }
}
