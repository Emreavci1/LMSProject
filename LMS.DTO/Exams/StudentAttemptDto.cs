namespace LMS.DTO.Exams;

// Devam eden (InProgress) bir deneme — kaydedilmiş cevaplar + kalan süre.
// Süresiz sınavda Deadline/RemainingSeconds null'dır (öğrenci bölerek çözebilir).
public class StudentAttemptDto
{
    public int Id { get; set; }
    public DateTime StartedDate { get; set; }
    // Süreli sınavda bitiş anı (UTC); süresizde null
    public DateTime? Deadline { get; set; }
    // Kalan saniye (süreli sınavda); süresizde null. İstemci sayacı bununla başlar.
    public int? RemainingSeconds { get; set; }
    // Şu ana dek kaydedilmiş cevaplar (resume için)
    public List<StudentAnswerDto> Answers { get; set; } = new();
}
