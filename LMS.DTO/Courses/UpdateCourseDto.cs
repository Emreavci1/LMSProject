namespace LMS.DTO.Courses;

// Kurs güncellerken gönderilen veri
public class UpdateCourseDto
{
    public string Title { get; set; } = null!;
    public string Description { get; set; } = null!;
    public string? CoverImageUrl { get; set; }
    public string? Category { get; set; }
    public string? Level { get; set; }
    public int DurationHours { get; set; }
    public int LessonCount { get; set; }

    // Opsiyonel: gönderilmezse mevcut durum korunur
    public string? Status { get; set; }
    public DateTime? PublishDate { get; set; }

    // Aktif/Pasif (soft delete) — gönderilmezse mevcut değer korunur
    public bool? IsActive { get; set; }

    // Zorunlu eğitim işareti — yalnızca Admin değiştirebilir, gönderilmezse korunur
    public bool? IsMandatory { get; set; }
}
