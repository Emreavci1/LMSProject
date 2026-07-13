namespace LMS.DTO.Lessons;

// Yeni ders eklerken gönderilen veri.
// CourseId route'tan gelir (body'de değil), Order servis tarafından atanır.
public class CreateLessonDto
{
    public string Section { get; set; } = null!;
    public string Title { get; set; } = null!;
    public string? Description { get; set; }
    public int DurationMin { get; set; }

    // Opsiyonel: gönderilmezse servis "Video" kabul eder
    public string? ContentType { get; set; }
    public string? ContentUrl { get; set; }
    public string? TextContent { get; set; }

    // Opsiyonel eğitmen notları
    public string? Notes { get; set; }

    // Ders yükü (kredi): 1 | 2 | 3 — opsiyonel, gönderilmezse 1.
    // İlerleme yüzdesine etkisini belirler (3 = en yüksek etki).
    public int? Weight { get; set; }
}
