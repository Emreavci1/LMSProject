namespace LMS.DTO.Enrollments;

// Kullanıcının bir kursa katılım bilgisi
public class EnrollmentDto
{
    public int Id { get; set; }
    public int CourseId { get; set; }
    public string CourseTitle { get; set; } = null!;
    public string InstructorName { get; set; } = null!;
    public DateTime EnrollDate { get; set; }

    // Admin ataması mı (zorunlu eğitim)? Atanmış kayıttan ayrılınamaz,
    // frontend "Ayrıl" butonunu gizler ve "Zorunlu" rozeti gösterir.
    public bool IsAssigned { get; set; }

    // Zorunlu eğitimin son tamamlama tarihi (yalnızca atamalarda dolu)
    public DateTime? DueDate { get; set; }
}
