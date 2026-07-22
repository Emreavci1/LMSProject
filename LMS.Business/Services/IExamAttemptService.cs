using LMS.Business.Common;
using LMS.DTO.Exams;

namespace LMS.Business.Services;

// Öğrencinin sınava girme akışı: durum yükle → deneme başlat → cevap kaydet → gönder.
// Tüm kurallar (kayıt, kilit, deneme hakkı, süre denetimi, otomatik puanlama) burada.
public interface IExamAttemptService
{
    // Sınav sayfası durumu: sorular (cevapsız) + kilit + devam eden deneme + son sonuç
    Task<ServiceResult<StudentExamDto>> GetStudentExamAsync(int examId, int userId);

    // Yeni deneme başlat (kilit + deneme hakkı kontrolü). Devam eden varsa onu döner (resume).
    Task<ServiceResult<StudentAttemptDto>> StartAttemptAsync(int examId, int userId);

    // Devam eden denemeye cevapları kaydet (süresizde taslak; süreli oturumda ara kayıt)
    Task<ServiceResult<StudentAttemptDto>> SaveAnswersAsync(int examId, int attemptId, SaveAnswersDto dto, int userId);

    // Denemeyi gönder: cevapları kesinleştir, çoktan seçmelileri otomatik puanla
    Task<ServiceResult<StudentResultDto>> SubmitAttemptAsync(int examId, int attemptId, SaveAnswersDto dto, int userId);
}
