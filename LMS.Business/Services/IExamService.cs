using LMS.Business.Common;
using LMS.DTO.Exams;

namespace LMS.Business.Services;

public interface IExamService
{
    // Bir kursun sınav listesi (özet, doğru cevap içermez) — giriş yapan herkes
    Task<ServiceResult<List<ExamListItemDto>>> GetByCourseAsync(int courseId);

    // Tek sınav, soruları + doğru şıklarıyla — yalnızca sahibi Instructor/Admin
    // (doğru cevaplar içerdiği için sahiplik kontrollü)
    Task<ServiceResult<ExamDto>> GetByIdAsync(int courseId, int examId, int currentUserId, bool isAdmin);

    // Oluştur / güncelle / sil — yalnızca kursun sahibi Instructor veya Admin
    Task<ServiceResult<ExamDto>> CreateAsync(int courseId, SaveExamDto dto, int currentUserId, bool isAdmin);
    Task<ServiceResult<ExamDto>> UpdateAsync(int courseId, int examId, SaveExamDto dto, int currentUserId, bool isAdmin);
    Task<ServiceResult> DeleteAsync(int courseId, int examId, int currentUserId, bool isAdmin);
}
