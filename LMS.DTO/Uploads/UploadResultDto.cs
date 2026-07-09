namespace LMS.DTO.Uploads;

// Başarılı dosya yüklemesinin cevabı.
// Url: dosyanın sunucudaki göreli yolu (örn. /uploads/images/abc.jpg) —
// ders oluştururken ContentUrl alanına bu değer yazılır.
public class UploadResultDto
{
    public string Url { get; set; } = null!;

    // Kullanıcının yüklediği orijinal dosya adı (arayüzde göstermek için)
    public string FileName { get; set; } = null!;
}
