namespace LMS.DTO.Exams;

// Sınav kaydederken bir şıkkın gönderilen hali.
// Id yok: sınav bütün olarak kaydedilir (sorular/şıklar her kayıtta yeniden yazılır).
public class SaveQuestionOptionDto
{
    public string Text { get; set; } = null!;
    public bool IsCorrect { get; set; }
}
