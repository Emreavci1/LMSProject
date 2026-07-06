namespace LMS.DTO.Courses;

// Kurs oluştururken gönderilen veri.
// InstructorId burada YOK — kurs, token'daki kullanıcıya atanır
// (client "başkası adına kurs açamasın" diye).
public class CreateCourseDto
{
    public string Title { get; set; } = null!;
    public string Description { get; set; } = null!;
    public string? CoverImageUrl { get; set; }
    public string? Category { get; set; }
    public string? Level { get; set; }
    public int DurationHours { get; set; }
    public int LessonCount { get; set; }

    // Opsiyonel: gönderilmezse servis "Draft" kabul eder
    public string? Status { get; set; }
    public DateTime? PublishDate { get; set; }
}
