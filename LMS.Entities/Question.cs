using LMS.Entities.Enums;

namespace LMS.Entities;

// Bir sınav sorusu. Puanlar şimdilik tüm sorulara EŞİT dağıtılır (nihai puan,
// soruların kredi ortalaması olarak 100 üzerinden hesaplanır); ağırlık ileride eklenebilir.
public class Question
{
    public int Id { get; set; }

    public int ExamId { get; set; }
    public Exam Exam { get; set; } = null!;

    public QuestionType Type { get; set; }

    // Soru metni
    public string Text { get; set; } = null!;

    // Sınav içindeki sıra
    public int Order { get; set; }

    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

    // Yalnızca MultipleChoice sorularda dolu (şıklar). OpenEnded'da boş kalır.
    public ICollection<QuestionOption> Options { get; set; } = new List<QuestionOption>();
}
