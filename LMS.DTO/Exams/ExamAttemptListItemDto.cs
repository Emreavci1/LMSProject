namespace LMS.DTO.Exams;

// Eğitmen/admin değerlendirme ekranı: bir sınava girmiş öğrencilerin deneme özeti.
// Her öğrencinin EN SON gönderilen denemesi (son deneme geçerli).
public class ExamAttemptListItemDto
{
    public int AttemptId { get; set; }
    public int UserId { get; set; }
    public string StudentName { get; set; } = null!;
    public string StudentEmail { get; set; } = null!;
    public DateTime? SubmittedDate { get; set; }

    public string Status { get; set; } = null!; // "Submitted" | "Evaluated"
    public int? Score { get; set; }
    public bool? Passed { get; set; }

    // Değerlendirme bekliyor mu? (açık uçlu içeren sınav + henüz Evaluated değil)
    public bool NeedsEvaluation { get; set; }
}
