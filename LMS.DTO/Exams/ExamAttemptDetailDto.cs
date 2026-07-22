namespace LMS.DTO.Exams;

// Değerlendirme için tek denemenin tüm ayrıntısı (öğrenci cevapları + puanlar).
public class ExamAttemptDetailDto
{
    public int AttemptId { get; set; }
    public int UserId { get; set; }
    public string StudentName { get; set; } = null!;
    public string StudentEmail { get; set; } = null!;
    public DateTime? SubmittedDate { get; set; }

    public string Status { get; set; } = null!;
    public int? Score { get; set; }
    public bool? Passed { get; set; }

    // Sınavda açık uçlu soru var mı? (yoksa değerlendirme gerekmez — salt görünüm)
    public bool HasOpenEnded { get; set; }

    public List<EvalAnswerDto> Answers { get; set; } = new();
}
