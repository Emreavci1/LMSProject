using LMS.Business.Services;
using LMS.DTO.Exams;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LMS.Api.Controllers;

// Sınavlar bir kursa bağlıdır: route /api/courses/{courseId}/exams
[ApiController]
[Route("api/courses/{courseId:int}/exams")]
[Authorize] // tüm endpoint'ler giriş gerektirir
public class ExamController : ApiControllerBase
{
    private readonly IExamService _examService;

    public ExamController(IExamService examService)
    {
        _examService = examService;
    }

    // GET /api/courses/{courseId}/exams — sınav listesi (özet; doğru cevap içermez)
    [HttpGet]
    public async Task<ActionResult<List<ExamListItemDto>>> GetByCourse(int courseId)
    {
        var result = await _examService.GetByCourseAsync(courseId);
        if (!result.Success)
            return ToErrorResponse(result);

        return Ok(result.Data);
    }

    // GET /api/courses/{courseId}/exams/{examId} — tam sınav (sorular + doğru şıklar)
    // Doğru cevap içerdiğinden yalnızca sahibi Instructor veya Admin erişebilir
    [HttpGet("{examId:int}")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<ActionResult<ExamDto>> GetById(int courseId, int examId)
    {
        var result = await _examService.GetByIdAsync(courseId, examId, CurrentUserId, IsAdmin);
        if (!result.Success)
            return ToErrorResponse(result);

        return Ok(result.Data);
    }

    // POST /api/courses/{courseId}/exams — sınav oluştur (yalnızca sahibi Instructor veya Admin)
    [HttpPost]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<ActionResult<ExamDto>> Create(int courseId, [FromBody] SaveExamDto dto)
    {
        var result = await _examService.CreateAsync(courseId, dto, CurrentUserId, IsAdmin);
        if (!result.Success)
            return ToErrorResponse(result);

        return CreatedAtAction(nameof(GetById), new { courseId, examId = result.Data!.Id }, result.Data);
    }

    // PUT /api/courses/{courseId}/exams/{examId} — sınav güncelle (yalnızca sahibi Instructor veya Admin)
    [HttpPut("{examId:int}")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<ActionResult<ExamDto>> Update(int courseId, int examId, [FromBody] SaveExamDto dto)
    {
        var result = await _examService.UpdateAsync(courseId, examId, dto, CurrentUserId, IsAdmin);
        if (!result.Success)
            return ToErrorResponse(result);

        return Ok(result.Data);
    }

    // DELETE /api/courses/{courseId}/exams/{examId} — sınav sil (yalnızca sahibi Instructor veya Admin)
    [HttpDelete("{examId:int}")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<ActionResult> Delete(int courseId, int examId)
    {
        var result = await _examService.DeleteAsync(courseId, examId, CurrentUserId, IsAdmin);
        if (!result.Success)
            return ToErrorResponse(result);

        return NoContent();
    }
}
