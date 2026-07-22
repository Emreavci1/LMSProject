namespace LMS.Entities;

// Bir kursun sonundaki sınav. Bir kursta birden çok sınav olabilir (dersler gibi
// müfredat öğesi). Sınava ancak kursun tüm dersleri tamamlanınca girilebilir
// (bu kural service katmanında uygulanır).
public class Exam
{
    public int Id { get; set; }

    // Sınav hangi kursa ait (sahiplik kontrolü kursun eğitmeni üzerinden yapılır)
    public int CourseId { get; set; }
    public Course Course { get; set; } = null!;

    public string Title { get; set; } = null!;

    // Yönerge/açıklama (opsiyonel)
    public string? Description { get; set; }

    // Süre sınırı (dakika). null = süresiz: öğrenci bölerek (bugün yarısı, yarın yarısı)
    // cevaplayıp sonra gönderebilir. Dolu = başlatınca sayaç işler (tek oturum).
    public int? TimeLimitMin { get; set; }

    // Deneme hakkı sayısı (eğitmen belirler, en az 1)
    public int MaxAttempts { get; set; } = 1;

    // Müfredattaki sıra (birden çok sınav arasında; küçük olan önce)
    public int Order { get; set; }

    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

    // Sınavın soruları
    public ICollection<Question> Questions { get; set; } = new List<Question>();

    // Bu sınava yapılan öğrenci denemeleri
    public ICollection<ExamAttempt> Attempts { get; set; } = new List<ExamAttempt>();
}
