namespace LMS.DTO.Enrollments;

// Bir kursa katılan kişinin bilgisi (eğitmen/admin görür)
public class CourseAttendeeDto
{
    public int UserId { get; set; }
    public string FullName { get; set; } = null!;
    public string Email { get; set; } = null!;
    public DateTime EnrollDate { get; set; }

    // İlerleme yüzdesi (0-100): tamamlanan ders / kurstaki toplam ders
    public int Progress { get; set; }
}
