using LMS.Business.Services;
using LMS.DTO.Auth;
using Microsoft.AspNetCore.Mvc;

namespace LMS.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    // Controller iş mantığı içermez; işi Service'e devreder
    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    // POST /api/auth/login — sistemin herkese açık tek endpoint'i
    [HttpPost("login")]
    public async Task<ActionResult<LoginResponseDto>> Login([FromBody] LoginRequestDto request)
    {
        var response = await _authService.LoginAsync(request);

        // Kullanıcı yok / şifre yanlış / hesap pasif → hepsi aynı genel mesaj (güvenlik)
        if (response is null)
            return Unauthorized(new { message = "Email veya şifre hatalı." });

        return Ok(response);
    }
}
