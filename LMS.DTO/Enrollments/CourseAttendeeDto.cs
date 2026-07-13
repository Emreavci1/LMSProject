namespace LMS.DTO.Enrollments;

// Bir kursa katılan kişinin bilgisi (eğitmen/admin görür)
public class CourseAttendeeDto
{
    public int UserId { get; set; }
    public string FullName { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string? AvatarUrl { get; set; }
    public DateTime EnrollDate { get; set; }

    // İlerleme yüzdesi (0-100): tamamlanan ders / kurstaki toplam ders
    public int Progress { get; set; }

    // Admin ataması mı, gönüllü katılım mı?
    public bool IsAssigned { get; set; }

    // Zorunlu eğitimin son tamamlama tarihi (yalnızca atamalarda dolu)
    public DateTime? DueDate { get; set; }

    // Gecikmiş mi: ilerleme < %100 VE son tarih geçmiş (anlık hesaplanır, saklanmaz)
    public bool IsOverdue { get; set; }
}
