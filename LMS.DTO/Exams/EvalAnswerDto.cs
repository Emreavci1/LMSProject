namespace LMS.DTO.Exams;

// Değerlendirme ekranında bir sorunun öğrenci cevabı + (varsa) doğru bilgisi.
public class EvalOptionDto
{
    public int Id { get; set; }
    public string Text { get; set; } = null!;
    public bool IsCorrect { get; set; } // eğitmen doğruyu görebilir
    public int Order { get; set; }
}

public class EvalAnswerDto
{
    public int QuestionId { get; set; }
    public string Type { get; set; } = null!; // "MultipleChoice" | "OpenEnded"
    public string QuestionText { get; set; } = null!;
    public int Order { get; set; }

    // Çoktan seçmeli: şıklar + öğrencinin seçtiği + otomatik kredi (0/100)
    public List<EvalOptionDto> Options { get; set; } = new();
    public int? SelectedOptionId { get; set; }

    // Açık uçlu: öğrencinin yazdığı metin
    public string? TextAnswer { get; set; }

    // Bu cevabın kredisi (0-100). MC otomatik; açık uçlu eğitmen tarafından verilir (null=henüz yok)
    public int? CreditPercent { get; set; }
}
