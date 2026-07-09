using LMS.Business.Common;
using LMS.DTO.Uploads;

namespace LMS.Business.Services;

// Dosya depolama soyutlaması.
// Şimdilik yerel disk (wwwroot/uploads); ileride bulut depolamaya geçilirse
// yalnızca implementasyon değişir, controller/servisler değişmez.
public interface IFileStorageService
{
    // Dosyayı içerik tipine (Image/Document/Video) göre doğrulayıp kaydeder,
    // başarılıysa göreli URL döner. Veritabanına dosyanın kendisi DEĞİL,
    // yalnızca bu yol yazılır.
    Task<ServiceResult<UploadResultDto>> SaveAsync(
        Stream content, string originalFileName, long length, string contentType);
}
