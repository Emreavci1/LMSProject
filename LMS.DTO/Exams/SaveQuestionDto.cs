namespace LMS.DTO.Exams;

// Sınav kaydederken bir sorunun gönderilen hali.
// Sıra (Order), gönderilen liste sırasına göre servis tarafından atanır.
public class SaveQuestionDto
{
    // "MultipleChoice" | "OpenEnded"
    public string Type { get; set; } = null!;

    public string Text { get; set; } = null!;

    // Yalnızca MultipleChoice'ta anlamlı; OpenEnded'da boş bırakılır
    public List<SaveQuestionOptionDto> Options { get; set; } = new();
}
