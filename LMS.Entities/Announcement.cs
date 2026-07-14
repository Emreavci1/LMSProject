using LMS.Entities.Enums;

namespace LMS.Entities;

public class Announcement
{
    public int Id { get; set; }
    
    public string Title { get; set; } = null!;
    
    public string Content { get; set; } = null!;

    // Null ise Genel Duyuru, Dolu ise Kurs Duyurusu
    public int? CourseId { get; set; }
    public Course? Course { get; set; }

    // Duyuruyu oluşturan kişi (Admin veya Instructor)
    public int AuthorId { get; set; }
    public User Author { get; set; } = null!;

    // İleri tarihli yayınlama desteği
    public DateTime PublishDate { get; set; } = DateTime.UtcNow;

    // Opsiyonel son geçerlilik tarihi: bu andan sonra duyuru kimseye gösterilmez
    // (yok olur). Null ise süresiz geçerlidir.
    public DateTime? ExpiryDate { get; set; }

    public DateTime CreatedDate { get; set; } = DateTime.UtcNow;

    public bool IsActive { get; set; } = true;

    // Opsiyonel ek dosya (yüklenen dosyanın URL'i + gösterim için orijinal adı)
    public string? AttachmentUrl { get; set; }
    public string? AttachmentName { get; set; }
}
