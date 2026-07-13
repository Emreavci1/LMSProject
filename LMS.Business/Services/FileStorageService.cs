using LMS.Business.Common;
using LMS.DTO.Uploads;

namespace LMS.Business.Services;

// Yerel disk depolama: dosyalar wwwroot/uploads/{images|documents|videos} altına
// rastgele (GUID) adla kaydedilir, veritabanında yalnızca göreli yol tutulur.
// Kök klasör yolu Program.cs'te DI ile verilir (bu katman ASP.NET'e bağımlı değil).
public class FileStorageService : IFileStorageService
{
    private readonly string _uploadsRoot;

    public FileStorageService(string uploadsRoot)
    {
        _uploadsRoot = uploadsRoot;
    }

    public async Task<ServiceResult<UploadResultDto>> SaveAsync(
        Stream content, string originalFileName, long length, string contentType)
    {
        // Doğrulama kuralları MinIO ile ortak (UploadRules — tek kaynak)
        var (error, folder, storedName) = UploadRules.Validate(originalFileName, length, contentType);
        if (error is not null)
            return ServiceResult<UploadResultDto>.Fail(ServiceErrorType.Validation, error);

        var folderPath = Path.Combine(_uploadsRoot, folder);
        Directory.CreateDirectory(folderPath); // yoksa oluştur

        var fullPath = Path.Combine(folderPath, storedName);
        await using (var fileStream = File.Create(fullPath))
        {
            await content.CopyToAsync(fileStream);
        }

        return ServiceResult<UploadResultDto>.Ok(new UploadResultDto
        {
            // Tarayıcının erişeceği göreli yol (UseStaticFiles wwwroot'u kök alır)
            Url = $"/uploads/{folder}/{storedName}",
            FileName = originalFileName
        });
    }
}
