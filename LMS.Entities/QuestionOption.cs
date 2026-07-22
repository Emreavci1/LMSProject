namespace LMS.Entities;

// Çoktan seçmeli bir sorunun şıkkı. Doğru şık IsCorrect ile işaretlenir.
public class QuestionOption
{
    public int Id { get; set; }

    public int QuestionId { get; set; }
    public Question Question { get; set; } = null!;

    public string Text { get; set; } = null!;

    // Doğru cevap mı? (Otomatik puanlama bunu kullanır)
    public bool IsCorrect { get; set; }

    // Soru içindeki şık sırası
    public int Order { get; set; }
}
