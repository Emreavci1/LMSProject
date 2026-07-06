namespace LMS.DTO.Users;

// Admin'in yeni kullanıcı oluştururken gönderdiği veri
public class CreateUserDto
{
    public string FullName { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string Password { get; set; } = null!;

    // "CourseAttendee", "Instructor" veya "Admin" — validator kontrol eder
    public string Role { get; set; } = null!;
    public string? AvatarUrl { get; set; }
}
