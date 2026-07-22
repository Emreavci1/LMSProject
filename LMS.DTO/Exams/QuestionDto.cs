namespace LMS.DTO.Exams;

// Bir sınav sorusu — client'a dönen hali.
public class QuestionDto
{
    public int Id { get; set; }

    // Soru tipi metin olarak ("MultipleChoice" | "OpenEnded")
    public string Type { get; set; } = null!;

    public string Text { get; set; } = null!;
    public int Order { get; set; }

    // Yalnızca MultipleChoice sorularda dolu; OpenEnded'da boş liste
    public List<QuestionOptionDto> Options { get; set; } = new();
}
