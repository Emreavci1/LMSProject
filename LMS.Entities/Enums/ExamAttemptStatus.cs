namespace LMS.Entities.Enums;

// Bir sınav denemesinin durumu.
public enum ExamAttemptStatus
{
    // Öğrenci cevaplıyor. Süresiz sınavda kaydedilip sonra kaldığı yerden devam edilebilir (taslak).
    InProgress = 0,

    // Öğrenci gönderdi; çoktan seçmeliler otomatik puanlandı.
    // Açık uçlu varsa veya geçti/kaldı kararı verilmediyse değerlendirme bekler.
    Submitted = 1,

    // Eğitmen/admin değerlendirmeyi bitirdi: nihai puan + geçti/kaldı kararı verildi.
    Evaluated = 2
}
