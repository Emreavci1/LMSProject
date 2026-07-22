namespace LMS.DTO.Exams;

// Gönderilmiş bir denemenin öğrenciye görünen sonucu.
public class StudentResultDto
{
    public int AttemptId { get; set; }
    public string Status { get; set; } = null!; // "Submitted" | "Evaluated"
    public DateTime? SubmittedDate { get; set; }

    // Nihai puan (0-100). Açık uçlu soru varsa değerlendirme bitene kadar null.
    public int? Score { get; set; }

    // Puan henüz kesinleşmedi mi? (açık uçlu var ve eğitmen değerlendirmesi bekliyor)
    public bool Pending { get; set; }

    // Geçti/kaldı — her zaman eğitmen/admin verir (Faz 4). null = karar verilmedi.
    public bool? Passed { get; set; }
}
