namespace LMS.DTO.Exams;

// Eğitmen/admin değerlendirme gönderimi:
// açık uçlu soruların kredileri + geçti/kaldı kararı.
public class OpenEndedCreditDto
{
    public int QuestionId { get; set; }
    public int CreditPercent { get; set; } // 0-100
}

public class EvaluateAttemptDto
{
    // Yalnızca açık uçlu soruların kredileri (MC otomatik puanlanır, buraya gelmez)
    public List<OpenEndedCreditDto> Credits { get; set; } = new();

    // Geçti mi? (eğitmen/admin kararı — sabit baraj yok)
    public bool Passed { get; set; }
}
