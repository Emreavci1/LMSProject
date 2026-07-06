namespace LMS.DTO.Courses;

// Kurs bilgisi — client'a dönen hali
public class CourseDto
{
    public int Id { get; set; }
    public string Title { get; set; } = null!;
    public string Description { get; set; } = null!;
    public int InstructorId { get; set; }
    public string InstructorName { get; set; } = null!;
    
    public string? CoverImageUrl { get; set; }
    public string? Category { get; set; }
    public string? Level { get; set; }
    public int DurationHours { get; set; }
    public int LessonCount { get; set; }

    // Yayın durumu ("Draft" | "Published" | "Scheduled") ve tarihi
    public string Status { get; set; } = null!;
    public DateTime? PublishDate { get; set; }

    public bool IsActive { get; set; }
    public DateTime CreatedDate { get; set; }
}
