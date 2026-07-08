using LMS.Entities.Enums;

namespace LMS.Entities;

// Bir kursa ait ders (müfredat öğesi).
// İçerik şimdilik URL/metin tabanlı — dosya yükleme ileride eklenecek.
public class Lesson
{
    public int Id { get; set; }

    // Ders hangi kursa ait (sahiplik kontrolü kursun eğitmeni üzerinden yapılır)
    public int CourseId { get; set; }
    public Course Course { get; set; } = null!;

    // Bölüm/modül adı (müfredatta gruplama için, örn. "Giriş", "Uygulama")
    public string Section { get; set; } = null!;
    public string Title { get; set; } = null!;
    public string? Description { get; set; }

    // Dakika cinsinden süre (müfredat toplam süresini hesaplamak için)
    public int DurationMin { get; set; }

    // İçerik tipi ve verisi
    public LessonContentType ContentType { get; set; } = LessonContentType.Video;
    public string? ContentUrl { get; set; }   // Video/Document için bağlantı
    public string? TextContent { get; set; }  // Text için okuma metni

    // Eğitmenin derse eklediği notlar (oynatıcıdaki "Notlar" sekmesinde gösterilir)
    public string? Notes { get; set; }

    // Müfredattaki sıra (küçük olan önce gösterilir)
    public int Order { get; set; }

    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
}
