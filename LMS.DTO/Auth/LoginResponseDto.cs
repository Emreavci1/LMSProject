namespace LMS.DTO.Auth;

// Başarılı login sonrası client'a dönen veri.
// Dikkat: PasswordHash gibi hassas alanlar asla burada yer almaz.
public class LoginResponseDto
{
    public int UserId { get; set; }
    public string Token { get; set; } = null!;
    public DateTime ExpiresAt { get; set; }
    public string FullName { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string Role { get; set; } = null!;

    // Profil fotoğrafı: dosya URL'i, "preset:male|female|neutral" veya null (varsayılan silüet)
    public string? AvatarUrl { get; set; }
}
