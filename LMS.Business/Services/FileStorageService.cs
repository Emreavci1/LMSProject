using LMS.Business.Common;
using LMS.DTO.Uploads;

namespace LMS.Business.Services;

// Yerel disk depolama: dosyalar wwwroot/uploads/{images|documents|videos} altına
// rastgele (GUID) adla kaydedilir, veritabanında yalnızca göreli yol tutulur.
// Kök klasör yolu Program.cs'te DI ile verilir (bu katman ASP.NET'e bağımlı değil).
public class FileStorageService : IFileStorageService
{
    private readonly string _uploadsRoot;

    // İçerik tipi başına: izin verilen uzantılar + üst boyut sınırı + alt klasör.
    // Uzantı beyaz listesi güvenlik içindir: .exe gibi dosyalar asla kabul edilmez.
    private static readonly Dictionary<string, (string[] Extensions, long MaxBytes, string Folder)> Rules =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["Image"] = (new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" }, 5 * 1024 * 1024, "images"),
            ["Document"] = (new[] { ".pdf", ".ppt", ".pptx", ".doc", ".docx" }, 25 * 1024 * 1024, "documents"),
            ["Video"] = (new[] { ".mp4", ".webm" }, 300L * 1024 * 1024, "videos"),
        };

    public FileStorageService(string uploadsRoot)
    {
        _uploadsRoot = uploadsRoot;
    }

    public async Task<ServiceResult<UploadResultDto>> SaveAsync(
        Stream content, string originalFileName, long length, string contentType)
    {
        if (!Rules.TryGetValue(contentType, out var rule))
            return ServiceResult<UploadResultDto>.Fail(ServiceErrorType.Validation,
                "Geçersiz içerik tipi. Dosya yüklemesi yalnızca Image/Document/Video için geçerlidir.");

        if (length <= 0)
            return ServiceResult<UploadResultDto>.Fail(ServiceErrorType.Validation, "Dosya boş.");

        if (length > rule.MaxBytes)
            return ServiceResult<UploadResultDto>.Fail(ServiceErrorType.Validation,
                $"Dosya çok büyük. Üst sınır: {rule.MaxBytes / (1024 * 1024)} MB.");

        var extension = Path.GetExtension(originalFileName);
        if (string.IsNullOrEmpty(extension) || !rule.Extensions.Contains(extension, StringComparer.OrdinalIgnoreCase))
            return ServiceResult<UploadResultDto>.Fail(ServiceErrorType.Validation,
                $"Desteklenmeyen dosya türü. İzin verilenler: {string.Join(", ", rule.Extensions)}");

        // Dosya adı asla kullanıcıdan alınmaz (path traversal / çakışma riski) — GUID üretilir
        var storedName = $"{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
        var folder = Path.Combine(_uploadsRoot, rule.Folder);
        Directory.CreateDirectory(folder); // yoksa oluştur

        var fullPath = Path.Combine(folder, storedName);
        await using (var fileStream = File.Create(fullPath))
        {
            await content.CopyToAsync(fileStream);
        }

        return ServiceResult<UploadResultDto>.Ok(new UploadResultDto
        {
            // Tarayıcının erişeceği göreli yol (UseStaticFiles wwwroot'u kök alır)
            Url = $"/uploads/{rule.Folder}/{storedName}",
            FileName = originalFileName
        });
    }
}
