namespace LMS.DTO.Exams;

// Sınav özeti (liste için) — sorular/şıklar YOK, yalnızca sayısı.
// Giriş yapan herkese dönebilir (doğru cevap içermez).
public class ExamListItemDto
{
    public int Id { get; set; }
    public int CourseId { get; set; }
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public int? TimeLimitMin { get; set; }
    public int MaxAttempts { get; set; }
    public int Order { get; set; }

    // Sorulardan hesaplanır (mapping'de)
    public int QuestionCount { get; set; }
}
