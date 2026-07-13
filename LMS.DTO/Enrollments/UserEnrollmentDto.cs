namespace LMS.DTO.Enrollments;

// Admin kullanıcı detayı: bir kullanıcının katıldığı kurs + ilerleme bilgisi
public class UserEnrollmentDto
{
    public int CourseId { get; set; }
    public string CourseTitle { get; set; } = null!;
    public string? Category { get; set; }
    public string InstructorName { get; set; } = null!;
    public DateTime EnrollDate { get; set; }

    // Zorunlu eğitim ataması bilgisi
    public bool IsAssigned { get; set; }
    public DateTime? DueDate { get; set; }
    public bool IsOverdue { get; set; }

    // İlerleme yüzdesi (0-100)
    public int Progress { get; set; }
}
