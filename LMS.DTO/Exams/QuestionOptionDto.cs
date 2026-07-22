namespace LMS.DTO.Exams;

// Çoktan seçmeli bir sorunun şıkkı — client'a dönen hali.
// Not: IsCorrect yalnızca eğitmen/admin'e dönen sınav detayında gösterilir
// (öğrenciye sınav çözerken doğru cevap sızmaz — o akış Faz 3'te ayrı DTO ile).
public class QuestionOptionDto
{
    public int Id { get; set; }
    public string Text { get; set; } = null!;
    public bool IsCorrect { get; set; }
    public int Order { get; set; }
}
