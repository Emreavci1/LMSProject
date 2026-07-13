using LMS.Business.Services;
using LMS.DTO.Users;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LMS.Api.Controllers;

// Kullanıcı yönetimi — kapalı sistem: kullanıcıları yalnızca Admin ekler/yönetir
[ApiController]
[Route("api/users")]
[Authorize(Roles = "Admin")]
public class UserController : ApiControllerBase
{
    private readonly IUserService _userService;
    private readonly IEnrollmentService _enrollmentService;
    private readonly ICourseService _courseService;

    public UserController(
        IUserService userService,
        IEnrollmentService enrollmentService,
        ICourseService courseService)
    {
        _userService = userService;
        _enrollmentService = enrollmentService;
        _courseService = courseService;
    }

    // GET /api/users — tüm kullanıcıları listele
    [HttpGet]
    public async Task<ActionResult<List<UserDto>>> GetAll()
        => Ok(await _userService.GetAllAsync());

    // POST /api/users — yeni kullanıcı oluştur (rol ataması dahil)
    [HttpPost]
    public async Task<ActionResult<UserDto>> Create([FromBody] CreateUserDto dto)
    {
        var result = await _userService.CreateAsync(dto);
        if (!result.Success)
            return ToErrorResponse(result);

        // 201 Created + oluşturulan kaynağın kendisi
        return CreatedAtAction(nameof(GetAll), result.Data);
    }

    // PUT /api/users/{id} — kullanıcı güncelle
    [HttpPut("{id:int}")]
    public async Task<ActionResult<UserDto>> Update(int id, [FromBody] UpdateUserDto dto)
    {
        var result = await _userService.UpdateAsync(id, dto);
        if (!result.Success)
            return ToErrorResponse(result);

        return Ok(result.Data);
    }

    // GET /api/users/{id}/enrollments — kullanıcının katıldığı kurslar + ilerlemeleri
    // (Admin kullanıcı detay sayfası)
    [HttpGet("{id:int}/enrollments")]
    public async Task<ActionResult<List<LMS.DTO.Enrollments.UserEnrollmentDto>>> GetUserEnrollments(int id)
        => Ok(await _enrollmentService.GetUserEnrollmentsForAdminAsync(id));

    // GET /api/users/{id}/courses — kullanıcının (eğitmen/admin) açtığı kurslar
    [HttpGet("{id:int}/courses")]
    public async Task<ActionResult<List<LMS.DTO.Courses.CourseDto>>> GetUserCourses(int id)
        => Ok(await _courseService.GetMyCoursesAsync(id));

    // DELETE /api/users/{id} — pasifleştirme (soft delete)
    [HttpDelete("{id:int}")]
    public async Task<ActionResult> Deactivate(int id)
    {
        var result = await _userService.DeactivateAsync(id, CurrentUserId);
        if (!result.Success)
            return ToErrorResponse(result);

        return NoContent(); // 204: başarılı, dönecek içerik yok
    }
}
