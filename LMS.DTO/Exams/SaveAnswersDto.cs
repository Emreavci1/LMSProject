namespace LMS.DTO.Exams;

// Deneme sırasında cevapları kaydetme/gönderme gövdesi.
// Kaydet (PUT) taslak olarak saklar; gönder (POST submit) aynı gövdeyi kullanıp kesinleştirir.
public class SaveAnswersDto
{
    public List<StudentAnswerDto> Answers { get; set; } = new();
}
