namespace LMS.DTO.Enrollments;

// Admin'in bir katılımcıyı zorunlu eğitime atama isteği
public class AssignEnrollmentDto
{
    public int UserId { get; set; }
    public int CourseId { get; set; }

    // Son tamamlama tarihi (zorunlu) — geciken katılımcılar bu tarihe göre raporlanır
    public DateTime DueDate { get; set; }
}
