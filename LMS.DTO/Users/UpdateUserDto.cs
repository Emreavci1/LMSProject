namespace LMS.DTO.Users;

// Admin'in kullanıcı güncellerken gönderdiği veri
public class UpdateUserDto
{
    public string FullName { get; set; } = null!;
    public string Email { get; set; } = null!;

    // "CourseAttendee", "Instructor" veya "Admin" — validator kontrol eder
    public string Role { get; set; } = null!;
    public string? AvatarUrl { get; set; }

    public bool IsActive { get; set; }

    // Boş bırakılırsa şifre değişmez
    public string? Password { get; set; }
}
