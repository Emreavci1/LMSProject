namespace LMS.DTO.Exams;

// Öğrencinin sınav sayfasına yüklenen tam durum: sorular (cevapsız) + kilit + deneme durumu.
public class StudentExamDto
{
    public int Id { get; set; }
    public int CourseId { get; set; }
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public int? TimeLimitMin { get; set; }
    public int MaxAttempts { get; set; }

    public List<StudentQuestionDto> Questions { get; set; } = new();

    // --- Kilit durumu: sınav ancak tüm dersler tamamlanınca açılır ---
    public bool IsUnlocked { get; set; }
    public string? LockReason { get; set; }
    public int LessonsCompleted { get; set; }
    public int LessonsTotal { get; set; }

    // --- Deneme durumu ---
    public int AttemptsUsed { get; set; }          // gönderilmiş deneme sayısı
    public bool CanStartNew { get; set; }          // açık + hak var + devam eden yok
    public StudentAttemptDto? ActiveAttempt { get; set; } // devam eden deneme (resume)
    public StudentResultDto? LastResult { get; set; }     // en son gönderilen denemenin sonucu
}
