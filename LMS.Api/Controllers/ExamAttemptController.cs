using LMS.Business.Services;
using LMS.DTO.Exams;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LMS.Api.Controllers;

// Öğrencinin sınava girme akışı. Sınav id'si global benzersiz olduğundan route kısa:
// /api/exams/{examId}/...  (kurs/kayıt/kilit kontrolleri service'te)
[ApiController]
[Route("api/exams/{examId:int}")]
[Authorize(Roles = "CourseAttendee")]
public class ExamAttemptController : ApiControllerBase
{
    private readonly IExamAttemptService _attemptService;

    public ExamAttemptController(IExamAttemptService attemptService)
    {
        _attemptService = attemptService;
    }

    // GET /api/exams/{examId}/my — sınav sayfası durumu (sorular cevapsız + kilit + deneme)
    [HttpGet("my")]
    public async Task<ActionResult<StudentExamDto>> GetMy(int examId)
    {
        var result = await _attemptService.GetStudentExamAsync(examId, CurrentUserId);
        if (!result.Success) return ToErrorResponse(result);
        return Ok(result.Data);
    }

    // POST /api/exams/{examId}/attempts — deneme başlat (devam eden varsa onu döner)
    [HttpPost("attempts")]
    public async Task<ActionResult<StudentAttemptDto>> Start(int examId)
    {
        var result = await _attemptService.StartAttemptAsync(examId, CurrentUserId);
        if (!result.Success) return ToErrorResponse(result);
        return Ok(result.Data);
    }

    // PUT /api/exams/{examId}/attempts/{attemptId} — cevapları taslak olarak kaydet
    [HttpPut("attempts/{attemptId:int}")]
    public async Task<ActionResult<StudentAttemptDto>> Save(int examId, int attemptId, [FromBody] SaveAnswersDto dto)
    {
        var result = await _attemptService.SaveAnswersAsync(examId, attemptId, dto, CurrentUserId);
        if (!result.Success) return ToErrorResponse(result);
        return Ok(result.Data);
    }

    // POST /api/exams/{examId}/attempts/{attemptId}/submit — denemeyi gönder (otomatik puanla)
    [HttpPost("attempts/{attemptId:int}/submit")]
    public async Task<ActionResult<StudentResultDto>> Submit(int examId, int attemptId, [FromBody] SaveAnswersDto dto)
    {
        var result = await _attemptService.SubmitAttemptAsync(examId, attemptId, dto, CurrentUserId);
        if (!result.Success) return ToErrorResponse(result);
        return Ok(result.Data);
    }
}
