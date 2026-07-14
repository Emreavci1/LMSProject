namespace LMS.DTO.Enrollments;

// Admin zorunlu eğitim raporu satırı: bir atama (kullanıcı × kurs) ve durumu
public class AssignmentReportDto
{
    public int UserId { get; set; }
    public string FullName { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string? AvatarUrl { get; set; }

    public int CourseId { get; set; }
    public string CourseTitle { get; set; } = null!;

    // Son tamamlama tarihi (atamalarda her zaman dolu)
    public DateTime? DueDate { get; set; }

    // İlerleme yüzdesi (0-100, ders yükü ağırlıklı)
    public int Progress { get; set; }

    // Gecikmiş: son tarih geçti ve ilerleme < %100 (anlık hesaplanır)
    public bool IsOverdue { get; set; }
}
