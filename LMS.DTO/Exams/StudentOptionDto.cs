namespace LMS.DTO.Exams;

// Öğrenciye sınav çözerken dönen şık — IsCorrect YOK (doğru cevap sızmasın).
public class StudentOptionDto
{
    public int Id { get; set; }
    public string Text { get; set; } = null!;
    public int Order { get; set; }
}
