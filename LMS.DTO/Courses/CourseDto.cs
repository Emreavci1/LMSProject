namespace LMS.DTO.Courses;

// Kurs bilgisi — client'a dönen hali
public class CourseDto
{
    public int Id { get; set; }
    public string Title { get; set; } = null!;
    public string Description { get; set; } = null!;
    public int InstructorId { get; set; }
    public string InstructorName { get; set; } = null!;
    
    public string? CoverImageUrl { get; set; }
    public string? Category { get; set; }
    public string? Level { get; set; }
    public int DurationHours { get; set; }
    public int LessonCount { get; set; }

    // Derslerin GERÇEK süre toplamı (dakika, yuvarlama yok).
    // "Takribi saat" gösterimi (98 dk → 2 saat) frontend'de bundan hesaplanır.
    public int DurationMinutes { get; set; }

    // Kursa kayıtlı katılımcı sayısı (Enrollments.Count'tan hesaplanır)
    public int StudentCount { get; set; }

    // Yayın durumu ("Draft" | "Published" | "Scheduled") ve tarihi
    public string Status { get; set; } = null!;
    public DateTime? PublishDate { get; set; }

    public bool IsActive { get; set; }

    // Zorunlu eğitim: katalogda listelenmez, katılım yalnızca Admin atamasıyla olur
    public bool IsMandatory { get; set; }

    // Kurum eğitimi: kursu açan kişi Admin (katılımcı arayüzünde öne çıkarılır)
    public bool IsOfficial { get; set; }

    public DateTime CreatedDate { get; set; }
}
