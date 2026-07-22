namespace LMS.DTO.Exams;

// Tam sınav (sorular + şıklar dahil) — düzenleme ekranı için.
// Doğru cevaplar da içerdiğinden yalnızca sahibi eğitmen/Admin'e dönülür.
public class ExamDto
{
    public int Id { get; set; }
    public int CourseId { get; set; }
    public string Title { get; set; } = null!;
    public string? Description { get; set; }

    // Süre sınırı (dakika). null = süresiz (bölerek çözülebilir).
    public int? TimeLimitMin { get; set; }

    // Deneme hakkı (en az 1)
    public int MaxAttempts { get; set; }

    // Müfredattaki sıra (birden çok sınav arasında)
    public int Order { get; set; }

    public List<QuestionDto> Questions { get; set; } = new();
}
