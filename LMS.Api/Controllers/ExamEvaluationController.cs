using LMS.Business.Services;
using LMS.DTO.Exams;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LMS.Api.Controllers;

// Eğitmen/admin: sınav denemelerini değerlendirme.
// Route: /api/courses/{courseId}/exams/{examId}/attempts
[ApiController]
[Route("api/courses/{courseId:int}/exams/{examId:int}/attempts")]
[Authorize(Roles = "Instructor,Admin")]
public class ExamEvaluationController : ApiControllerBase
{
    private readonly IExamEvaluationService _evaluationService;

    public ExamEvaluationController(IExamEvaluationService evaluationService)
    {
        _evaluationService = evaluationService;
    }

    // GET .../attempts — sınava girmiş öğrencilerin (son) denemeleri
    [HttpGet]
    public async Task<ActionResult<List<ExamAttemptListItemDto>>> GetAttempts(int courseId, int examId)
    {
        var result = await _evaluationService.GetAttemptsAsync(courseId, examId, CurrentUserId, IsAdmin);
        if (!result.Success) return ToErrorResponse(result);
        return Ok(result.Data);
    }

    // GET .../attempts/{attemptId} — tek denemenin ayrıntısı (puanlama ekranı)
    [HttpGet("{attemptId:int}")]
    public async Task<ActionResult<ExamAttemptDetailDto>> GetDetail(int courseId, int examId, int attemptId)
    {
        var result = await _evaluationService.GetAttemptDetailAsync(courseId, examId, attemptId, CurrentUserId, IsAdmin);
        if (!result.Success) return ToErrorResponse(result);
        return Ok(result.Data);
    }

    // POST .../attempts/{attemptId}/evaluate — açık uçlu kredileri + geçti/kaldı
    [HttpPost("{attemptId:int}/evaluate")]
    public async Task<ActionResult<ExamAttemptDetailDto>> Evaluate(int courseId, int examId, int attemptId, [FromBody] EvaluateAttemptDto dto)
    {
        var result = await _evaluationService.EvaluateAsync(courseId, examId, attemptId, dto, CurrentUserId, IsAdmin);
        if (!result.Success) return ToErrorResponse(result);
        return Ok(result.Data);
    }
}
