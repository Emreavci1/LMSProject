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

    // --- Sınav durumu özeti (kursta sınav varsa) ---
    public int ExamsTotal { get; set; }       // kurstaki sınav sayısı
    public int ExamsSubmitted { get; set; }   // öğrencinin gönderdiği (farklı) sınav sayısı
    public int ExamsPendingEval { get; set; } // açık uçlu, gönderilmiş ama değerlendirilmemiş
    public int ExamsPassed { get; set; }      // değerlendirilip geçilen
    public int ExamsFailed { get; set; }      // değerlendirilip kalınan
}
