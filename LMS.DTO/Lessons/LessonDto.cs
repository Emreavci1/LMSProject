namespace LMS.DTO.Lessons;

// Ders bilgisi — client'a dönen hali
public class LessonDto
{
    public int Id { get; set; }
    public int CourseId { get; set; }
    public string Section { get; set; } = null!;
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public int DurationMin { get; set; }

    // İçerik tipi metin olarak ("Video" | "Document" | "Text")
    public string ContentType { get; set; } = null!;
    public string? ContentUrl { get; set; }
    public string? TextContent { get; set; }

    // Eğitmenin ders notları ("Notlar" sekmesi)
    public string? Notes { get; set; }

    // Ders yükü (kredi): 1 | 2 | 3 — ilerleme yüzdesindeki ağırlığı
    public int Weight { get; set; }

    public int Order { get; set; }
}
