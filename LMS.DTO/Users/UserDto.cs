namespace LMS.DTO.Users;

// Kullanıcı bilgisi — client'a dönen hali.
// Dikkat: PasswordHash burada YOK ve asla olmamalı!
public class UserDto
{
    public int Id { get; set; }
    public string FullName { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string Role { get; set; } = null!;
    public string? AvatarUrl { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedDate { get; set; }
}
