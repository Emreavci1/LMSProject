namespace LMS.DTO.Auth;

// Login isteğinde client'tan gelen veri
public class LoginRequestDto
{
    public string Email { get; set; } = null!;
    public string Password { get; set; } = null!;
}
