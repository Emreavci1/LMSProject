using LMS.DTO.Auth;

namespace LMS.Business.Services;

public interface IAuthService
{
    // Email + şifre doğruysa JWT token içeren cevap döner, yanlışsa null döner
    Task<LoginResponseDto?> LoginAsync(LoginRequestDto request);
}
