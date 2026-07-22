namespace LMS.DTO.Exams;

// Öğrenciye dönen soru (doğru cevap bilgisi olmadan).
public class StudentQuestionDto
{
    public int Id { get; set; }
    public string Type { get; set; } = null!; // "MultipleChoice" | "OpenEnded"
    public string Text { get; set; } = null!;
    public int Order { get; set; }
    public List<StudentOptionDto> Options { get; set; } = new();
}
