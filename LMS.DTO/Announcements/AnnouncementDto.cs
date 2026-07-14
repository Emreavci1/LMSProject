namespace LMS.DTO.Announcements;

public class AnnouncementDto
{
    public int Id { get; set; }
    public string Title { get; set; } = null!;
    public string Content { get; set; } = null!;
    public int? CourseId { get; set; }
    
    public int AuthorId { get; set; }
    public string AuthorName { get; set; } = null!;
    public string? AuthorAvatarUrl { get; set; }

    public DateTime PublishDate { get; set; }
    // Opsiyonel son geçerlilik tarihi (null ise süresiz)
    public DateTime? ExpiryDate { get; set; }
    public DateTime CreatedDate { get; set; }

    // Opsiyonel ek dosya
    public string? AttachmentUrl { get; set; }
    public string? AttachmentName { get; set; }

    // UI'da ayırıcı olması için eklendi (CourseId == null ise true)
    public bool IsGlobal { get; set; }
}
