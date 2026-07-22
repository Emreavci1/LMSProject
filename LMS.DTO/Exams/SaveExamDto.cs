namespace LMS.DTO.Exams;

// Sınav oluşturma/güncelleme gövdesi (tek payload, iç içe sorular + şıklar).
// CourseId route'tan gelir; Order servis tarafından atanır.
public class SaveExamDto
{
    public string Title { get; set; } = null!;
    public string? Description { get; set; }

    // Süre sınırı (dakika). null = süresiz.
    public int? TimeLimitMin { get; set; }

    // Deneme hakkı (gönderilmezse 1)
    public int MaxAttempts { get; set; } = 1;

    public List<SaveQuestionDto> Questions { get; set; } = new();
}
