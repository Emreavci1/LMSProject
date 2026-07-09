using LMS.Business.Services;
using LMS.DTO.Courses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LMS.Api.Controllers;

[ApiController]
[Route("api/courses")]
[Authorize] // tüm endpoint'ler giriş gerektirir
public class CourseController : ApiControllerBase
{
    private readonly ICourseService _courseService;

    public CourseController(ICourseService courseService)
    {
        _courseService = courseService;
    }

    // GET /api/courses — aktif kurslar (tüm giriş yapmış kullanıcılar)
    [HttpGet]
    public async Task<ActionResult<List<CourseDto>>> GetAll()
        => Ok(await _courseService.GetActiveCoursesAsync());

    // GET /api/courses/my — Instructor'ın kendi kursları
    // DİKKAT: bu route, {id} route'undan ÖNCE tanımlanmalı ki "my" bir id sanılmasın
    [HttpGet("my")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<ActionResult<List<CourseDto>>> GetMyCourses()
        => Ok(await _courseService.GetMyCoursesAsync(CurrentUserId));

    // GET /api/courses/all — TÜM kurslar, pasif/taslak dahil (yalnızca Admin)
    [HttpGet("all")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<List<CourseDto>>> GetAllForAdmin()
        => Ok(await _courseService.GetAllCoursesAsync());

    // GET /api/courses/{id} — kurs detayı
    // (pasif kursu yalnızca sahibi veya Admin görebilir — kontrol service'te)
    [HttpGet("{id:int}")]
    public async Task<ActionResult<CourseDto>> GetById(int id)
    {
        var result = await _courseService.GetByIdAsync(id, CurrentUserId, IsAdmin);
        if (!result.Success)
            return ToErrorResponse(result);

        return Ok(result.Data);
    }

    // POST /api/courses — kurs oluştur (Instructor, Admin)
    [HttpPost]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<ActionResult<CourseDto>> Create([FromBody] CreateCourseDto dto)
    {
        var result = await _courseService.CreateAsync(dto, CurrentUserId);
        if (!result.Success)
            return ToErrorResponse(result);

        return CreatedAtAction(nameof(GetById), new { id = result.Data!.Id }, result.Data);
    }

    // PUT /api/courses/{id} — güncelle (yalnızca sahibi veya Admin)
    [HttpPut("{id:int}")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<ActionResult<CourseDto>> Update(int id, [FromBody] UpdateCourseDto dto)
    {
        // Sahiplik kontrolü service'te yapılır (rol kontrolü tek başına yeterli değil)
        var result = await _courseService.UpdateAsync(id, dto, CurrentUserId, IsAdmin);
        if (!result.Success)
            return ToErrorResponse(result);

        return Ok(result.Data);
    }

    // DELETE /api/courses/{id} — kalıcı sil (yalnızca sahibi veya Admin)
    // Not: Aktif/Pasif için PUT + IsActive kullanılır; bu uç kaydı tamamen kaldırır.
    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Instructor,Admin")]
    public async Task<ActionResult> Delete(int id)
    {
        var result = await _courseService.DeleteAsync(id, CurrentUserId, IsAdmin);
        if (!result.Success)
            return ToErrorResponse(result);

        return NoContent();
    }
}
