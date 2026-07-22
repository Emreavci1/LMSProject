namespace LMS.DTO.Exams;

// Bir soruya verilen cevap — hem kaydetme (giriş) hem gösterme (çıkış) için kullanılır.
public class StudentAnswerDto
{
    public int QuestionId { get; set; }
    // Çoktan seçmeli için seçilen şık (null = boş)
    public int? SelectedOptionId { get; set; }
    // Açık uçlu için yazılı cevap
    public string? TextAnswer { get; set; }
}
