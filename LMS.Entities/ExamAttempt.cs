using LMS.Entities.Enums;

namespace LMS.Entities;

// Bir öğrencinin bir sınava girme denemesi.
// Sınav "ders gibi" tamamlanabilir: denemenin gönderilmesi (Submitted) kurs ilerlemesine
// sayılır. Geçti/kaldı kararı bundan AYRIDIR ve her zaman eğitmen/admin tarafından verilir.
public class ExamAttempt
{
    public int Id { get; set; }

    public int ExamId { get; set; }
    public Exam Exam { get; set; } = null!;

    // Denemeyi yapan öğrenci
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public ExamAttemptStatus Status { get; set; } = ExamAttemptStatus.InProgress;

    public DateTime StartedDate { get; set; } = DateTime.UtcNow;
    public DateTime? SubmittedDate { get; set; }   // öğrenci gönderince
    public DateTime? EvaluatedDate { get; set; }    // eğitmen/admin değerlendirmeyi bitirince

    // Nihai puan (0-100). Açık uçlu yoksa gönderilince otomatik hesaplanır;
    // açık uçlu varsa değerlendirme bitince kesinleşir. null = henüz yok.
    public int? Score { get; set; }

    // Geçti/kaldı — HER ZAMAN eğitmen/admin verir (otomatik değil). null = karar verilmedi.
    public bool? Passed { get; set; }

    // Değerlendirmeyi/kararı kim yaptı (izlenebilirlik için)
    public int? EvaluatedById { get; set; }
    public User? EvaluatedBy { get; set; }

    // Bu denemede her soruya verilen cevaplar
    public ICollection<ExamAnswer> Answers { get; set; } = new List<ExamAnswer>();
}
