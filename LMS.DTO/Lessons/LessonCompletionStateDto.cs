namespace LMS.DTO.Lessons;

// Ders tamamlama toggle cevabı: işlem sonrası dersin durumu
public class LessonCompletionStateDto
{
    public int LessonId { get; set; }
    public bool Completed { get; set; }
}
