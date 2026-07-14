using LMS.Business.Common;

namespace LMS.Business.Services;

// Dosya yükleme kuralları — TEK KAYNAK.
// Hem yerel disk (FileStorageService) hem MinIO (MinioFileStorageService)
// aynı doğrulamayı buradan kullanır: uzantı beyaz listesi + boyut sınırı + klasör.
public static class UploadRules
{
    // İçerik tipi başına: izin verilen uzantılar + üst boyut sınırı + alt klasör.
    // Uzantı beyaz listesi güvenlik içindir: .exe gibi dosyalar asla kabul edilmez.
    private static readonly Dictionary<string, (string[] Extensions, long MaxBytes, string Folder)> Rules =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["Image"] = (new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" }, 5 * 1024 * 1024, "images"),
            ["Document"] = (new[] { ".pdf", ".ppt", ".pptx", ".doc", ".docx" }, 25 * 1024 * 1024, "documents"),
            ["Video"] = (new[] { ".mp4", ".webm" }, 300L * 1024 * 1024, "videos"),
            // Duyuru eki: hem belge hem görsel türlerine izin verir (tek yükleme tipi)
            ["Attachment"] = (new[] { ".pdf", ".ppt", ".pptx", ".doc", ".docx", ".xls", ".xlsx", ".jpg", ".jpeg", ".png", ".webp", ".zip", ".txt" }, 25 * 1024 * 1024, "attachments"),
        };

    // Doğrulama başarılıysa error=null; klasör adı ve GUID'li dosya adı üretilir.
    public static (string? Error, string Folder, string StoredName) Validate(
        string originalFileName, long length, string contentType)
    {
        if (!Rules.TryGetValue(contentType, out var rule))
            return ("Geçersiz içerik tipi. Dosya yüklemesi yalnızca Image/Document/Video için geçerlidir.", "", "");

        if (length <= 0)
            return ("Dosya boş.", "", "");

        if (length > rule.MaxBytes)
            return ($"Dosya çok büyük. Üst sınır: {rule.MaxBytes / (1024 * 1024)} MB.", "", "");

        var extension = Path.GetExtension(originalFileName);
        if (string.IsNullOrEmpty(extension) || !rule.Extensions.Contains(extension, StringComparer.OrdinalIgnoreCase))
            return ($"Desteklenmeyen dosya türü. İzin verilenler: {string.Join(", ", rule.Extensions)}", "", "");

        // Dosya adı asla kullanıcıdan alınmaz (path traversal / çakışma riski) — GUID üretilir
        var storedName = $"{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
        return (null, rule.Folder, storedName);
    }
}
