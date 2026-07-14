namespace LMS.DTO.Announcements;

public class UpdateAnnouncementDto
{
    public string Title { get; set; } = null!;
    public string Content { get; set; } = null!;
    public DateTime? PublishDate { get; set; }
    // Opsiyonel son geçerlilik tarihi (null gönderilirse süresiz olur)
    public DateTime? ExpiryDate { get; set; }
    public bool IsActive { get; set; }

    // Opsiyonel ek dosya (null gönderilirse ek kaldırılır)
    public string? AttachmentUrl { get; set; }
    public string? AttachmentName { get; set; }
}
