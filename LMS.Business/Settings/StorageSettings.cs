namespace LMS.Business.Settings;

// appsettings.json "Storage" bölümü — dosya depolama sağlayıcısı seçimi.
// Provider: "Local" (wwwroot/uploads) veya "Minio" (S3 uyumlu nesne depolama)
public class StorageSettings
{
    public const string SectionName = "Storage";

    public string Provider { get; set; } = "Local";
    public MinioSettings Minio { get; set; } = new();
}

public class MinioSettings
{
    public string Endpoint { get; set; } = "localhost:9000";
    public string AccessKey { get; set; } = "minioadmin";
    public string SecretKey { get; set; } = "minioadmin";
    public string Bucket { get; set; } = "lms-uploads";
    public bool UseSSL { get; set; } = false;
}
