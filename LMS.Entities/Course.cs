using LMS.Entities.Enums;

namespace LMS.Entities;

// Eğitmen (Instructor) tarafından oluşturulan kurs
public class Course
{
    public int Id { get; set; }
    public string Title { get; set; } = null!;
    public string Description { get; set; } = null!;

    // Kursun sahibi olan eğitmen (sahiplik kontrolü bu alan üzerinden yapılır)
    public int InstructorId { get; set; }
    public User Instructor { get; set; } = null!;

    // Soft delete: kurs silinmez, pasifleştirilir
    public bool IsActive { get; set; } = true;

    // Yeni Eklenen Alanlar
    public string? CoverImageUrl { get; set; }
    public string? Category { get; set; }
    public string? Level { get; set; }
    public int DurationHours { get; set; }
    public int LessonCount { get; set; }

    // Yayın iş akışı: taslak/yayında/zamanlanmış + opsiyonel yayın tarihi
    public CourseStatus Status { get; set; } = CourseStatus.Draft;
    public DateTime? PublishDate { get; set; }

    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

    public ICollection<Enrollment> Enrollments { get; set; } = new List<Enrollment>();

    // Kursun dersleri (müfredat). Kurs silinince dersleri de silinir (cascade).
    public ICollection<Lesson> Lessons { get; set; } = new List<Lesson>();
}
