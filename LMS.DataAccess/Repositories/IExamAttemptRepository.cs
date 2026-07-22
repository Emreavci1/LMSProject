using LMS.Entities;

namespace LMS.DataAccess.Repositories;

// Sınav denemelerine (ExamAttempt) özel sorgular
public interface IExamAttemptRepository : IRepository<ExamAttempt>
{
    // Bir kullanıcının bir sınava yaptığı TÜM denemeler (cevaplar olmadan) — sayım/son sonuç için
    Task<List<ExamAttempt>> GetByUserAndExamAsync(int userId, int examId);

    // Devam eden (InProgress) deneme — cevaplarıyla birlikte (resume için)
    Task<ExamAttempt?> GetActiveWithAnswersAsync(int userId, int examId);

    // Tek deneme — cevaplarıyla (kaydet/gönder işlemleri için, takip edilir/tracked)
    Task<ExamAttempt?> GetByIdWithAnswersAsync(int attemptId);

    // --- Değerlendirme (eğitmen/admin) ---

    // Bir sınava gönderilmiş TÜM denemeler (öğrenci bilgisiyle) — değerlendirme listesi için
    Task<List<ExamAttempt>> GetSubmittedByExamWithUserAsync(int examId);

    // Tek deneme — cevaplar + öğrenci (değerlendirme ekranı için)
    Task<ExamAttempt?> GetByIdWithAnswersAndUserAsync(int attemptId);

    // --- Rapor (Öğrenciler sekmesi + Zorunlu Eğitim Raporu) ---

    // Bir kurstaki gönderilmiş denemeler (examId/userId/status/passed) — sınav durumu özeti için
    Task<List<ExamAttempt>> GetSubmittedByCourseAsync(int courseId);

    // Birden çok kurstaki gönderilmiş denemeler TEK sorguda (admin raporu)
    Task<List<ExamAttempt>> GetSubmittedByCoursesAsync(List<int> courseIds);

    // --- İlerleme hesabı için (sınav "gönderilmiş" = Status != InProgress) ---

    // Bir kurstaki gönderilmiş sınavlar: kullanıcı id → gönderdiği sınav id'leri
    Task<Dictionary<int, List<int>>> GetSubmittedExamIdsByCourseAsync(int courseId);

    // Bir kullanıcının gönderdiği TÜM sınavların id'leri
    Task<List<int>> GetSubmittedExamIdsByUserAsync(int userId);

    // Birden çok kurstaki gönderimler TEK sorguda: (kursId, kullanıcıId) → sınav id'leri (admin raporu)
    Task<Dictionary<(int CourseId, int UserId), List<int>>> GetSubmittedExamIdsByCoursesAsync(List<int> courseIds);
}
