using LMS.Business.Common;
using LMS.DTO.Exams;

namespace LMS.Business.Services;

// Eğitmen/admin: sınav denemelerini değerlendirme (açık uçlu puanlama + geçti/kaldı).
// Yalnızca kursun sahibi eğitmen veya Admin.
public interface IExamEvaluationService
{
    // Bir sınava girmiş öğrencilerin (son) denemeleri — değerlendirme listesi
    Task<ServiceResult<List<ExamAttemptListItemDto>>> GetAttemptsAsync(int courseId, int examId, int currentUserId, bool isAdmin);

    // Tek denemenin ayrıntısı (cevaplar + puanlar) — puanlama ekranı
    Task<ServiceResult<ExamAttemptDetailDto>> GetAttemptDetailAsync(int courseId, int examId, int attemptId, int currentUserId, bool isAdmin);

    // Değerlendir: açık uçlu kredileri + geçti/kaldı kararı → Evaluated
    Task<ServiceResult<ExamAttemptDetailDto>> EvaluateAsync(int courseId, int examId, int attemptId, EvaluateAttemptDto dto, int currentUserId, bool isAdmin);
}
