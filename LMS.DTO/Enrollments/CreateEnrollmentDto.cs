namespace LMS.DTO.Enrollments;

// Kursa katılma isteği — UserId token'dan alınır, client göndermez
public class CreateEnrollmentDto
{
    public int CourseId { get; set; }
}
