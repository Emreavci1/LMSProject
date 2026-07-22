namespace LMS.DTO.Lessons;

// Ders güncellerken gönderilen veri. Şimdilik yalnızca başlık düzenlenir
// (kurs yönetim sayfasındaki hızlı başlık değiştirme). İçerik/tip/dosya
// düzenlemesi ileride genişletilebilir.
public class UpdateLessonDto
{
    public string Title { get; set; } = null!;
}
