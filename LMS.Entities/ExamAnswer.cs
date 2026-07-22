namespace LMS.Entities;

// Bir denemede tek bir soruya verilen cevap.
public class ExamAnswer
{
    public int Id { get; set; }

    public int AttemptId { get; set; }
    public ExamAttempt Attempt { get; set; } = null!;

    public int QuestionId { get; set; }
    public Question Question { get; set; } = null!;

    // Çoktan seçmeli için seçilen şık (null = boş bırakıldı)
    public int? SelectedOptionId { get; set; }
    public QuestionOption? SelectedOption { get; set; }

    // Açık uçlu için yazılı cevap
    public string? TextAnswer { get; set; }

    // Bu sorudan alınan kredi (0-100). Çoktan seçmeli: otomatik 0 veya 100.
    // Açık uçlu: eğitmen/admin 0-100 arası verir. Nihai puan = tüm kredilerin ortalaması.
    // null = henüz değerlendirilmedi.
    public int? CreditPercent { get; set; }
}
