namespace LMS.DTO.Announcements;

public class CreateAnnouncementDto
{
    public string Title { get; set; } = null!;
    public string Content { get; set; } = null!;
    public int? CourseId { get; set; }
    public DateTime? PublishDate { get; set; }
    // Opsiyonel son geçerlilik tarihi (null ise süresiz)
    public DateTime? ExpiryDate { get; set; }

    // Opsiyonel ek dosya (önce /api/uploads ile yüklenir, dönen URL burada gönderilir)
    public string? AttachmentUrl { get; set; }
    public string? AttachmentName { get; set; }
}
