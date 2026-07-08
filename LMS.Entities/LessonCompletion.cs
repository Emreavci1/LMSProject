namespace LMS.Entities;

// Bir katılımcının bir dersi tamamladığı bilgisi.
// İlerleme yüzdesi bundan hesaplanır: tamamlanan ders / kurstaki toplam ders.
public class LessonCompletion
{
    public int Id { get; set; }

    // Dersi tamamlayan kullanıcı
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    // Tamamlanan ders
    public int LessonId { get; set; }
    public Lesson Lesson { get; set; } = null!;

    public DateTime CompletedDate { get; set; } = DateTime.UtcNow;
}
