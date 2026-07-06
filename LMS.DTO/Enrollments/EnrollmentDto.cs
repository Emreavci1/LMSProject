namespace LMS.DTO.Enrollments;

// Kullanıcının bir kursa katılım bilgisi
public class EnrollmentDto
{
    public int Id { get; set; }
    public int CourseId { get; set; }
    public string CourseTitle { get; set; } = null!;
    public string InstructorName { get; set; } = null!;
    public DateTime EnrollDate { get; set; }
}
