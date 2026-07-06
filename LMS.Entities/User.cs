using LMS.Entities.Enums;

namespace LMS.Entities;

// Sistemdeki kullanıcı (Admin, Instructor veya CourseAttendee)
public class User
{
    public int Id { get; set; }
    public string FullName { get; set; } = null!;
    public string Email { get; set; } = null!;

    // Şifre asla düz metin saklanmaz — hash'lenmiş hali tutulur.
    // Bu alan hiçbir zaman DTO ile dışarı açılmaz!
    public string PasswordHash { get; set; } = null!;

    public UserRole Role { get; set; }

    // Soft delete: kullanıcı silinmez, pasifleştirilir
    public bool IsActive { get; set; } = true;

    public string? AvatarUrl { get; set; }

    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

    // Navigation property'ler
    public ICollection<Course> Courses { get; set; } = new List<Course>();
    public ICollection<Enrollment> Enrollments { get; set; } = new List<Enrollment>();
}
