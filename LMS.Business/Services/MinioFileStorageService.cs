using LMS.Business.Common;
using LMS.Business.Settings;
using LMS.DTO.Uploads;
using Minio;
using Minio.DataModel.Args;

namespace LMS.Business.Services;

// MinIO (S3 uyumlu nesne depolama) ile dosya depolama.
// Yerel disk yerine dosyalar bir MinIO sunucusundaki bucket'a yüklenir;
// veritabanına dosyanın tam URL'i yazılır (örn. http://localhost:9000/lms-uploads/images/x.png).
// Sağlayıcı seçimi appsettings.json "Storage:Provider" ile yapılır (Local | Minio).
public class MinioFileStorageService : IFileStorageService
{
    private readonly IMinioClient _client;
    private readonly MinioSettings _settings;

    // Bucket'ı her istekte değil, ilk kullanımda bir kez hazırla
    private static readonly SemaphoreSlim InitLock = new(1, 1);
    private bool _bucketReady;

    public MinioFileStorageService(MinioSettings settings)
    {
        _settings = settings;
        _client = new MinioClient()
            .WithEndpoint(settings.Endpoint)
            .WithCredentials(settings.AccessKey, settings.SecretKey)
            .WithSSL(settings.UseSSL)
            .Build();
    }

    public async Task<ServiceResult<UploadResultDto>> SaveAsync(
        Stream content, string originalFileName, long length, string contentType)
    {
        // Doğrulama kuralları yerel diskle ortak (UploadRules — tek kaynak)
        var (error, folder, storedName) = UploadRules.Validate(originalFileName, length, contentType);
        if (error is not null)
            return ServiceResult<UploadResultDto>.Fail(ServiceErrorType.Validation, error);

        try
        {
            await EnsureBucketAsync();

            var objectName = $"{folder}/{storedName}";
            await _client.PutObjectAsync(new PutObjectArgs()
                .WithBucket(_settings.Bucket)
                .WithObject(objectName)
                .WithStreamData(content)
                .WithObjectSize(length)
                .WithContentType(GuessMime(storedName)));

            // Bucket public-read olduğu için tarayıcı dosyaya doğrudan bu URL'den erişir
            var scheme = _settings.UseSSL ? "https" : "http";
            return ServiceResult<UploadResultDto>.Ok(new UploadResultDto
            {
                Url = $"{scheme}://{_settings.Endpoint}/{_settings.Bucket}/{objectName}",
                FileName = originalFileName
            });
        }
        catch (Exception)
        {
            // MinIO sunucusuna ulaşılamıyor olabilir — kullanıcıya anlaşılır mesaj
            return ServiceResult<UploadResultDto>.Fail(ServiceErrorType.Validation,
                "Dosya deposuna (MinIO) ulaşılamadı. Sunucunun çalıştığından emin olun.");
        }
    }

    // Bucket yoksa oluşturur ve herkese-okuma (public read) politikası tanımlar.
    // Public read: kapalı kurum içi sistem için mevcut wwwroot/uploads davranışıyla aynı.
    private async Task EnsureBucketAsync()
    {
        if (_bucketReady) return;

        await InitLock.WaitAsync();
        try
        {
            if (_bucketReady) return;

            var exists = await _client.BucketExistsAsync(
                new BucketExistsArgs().WithBucket(_settings.Bucket));
            if (!exists)
            {
                await _client.MakeBucketAsync(new MakeBucketArgs().WithBucket(_settings.Bucket));

                var policy = $$"""
                {
                  "Version": "2012-10-17",
                  "Statement": [{
                    "Effect": "Allow",
                    "Principal": { "AWS": ["*"] },
                    "Action": ["s3:GetObject"],
                    "Resource": ["arn:aws:s3:::{{_settings.Bucket}}/*"]
                  }]
                }
                """;
                await _client.SetPolicyAsync(
                    new SetPolicyArgs().WithBucket(_settings.Bucket).WithPolicy(policy));
            }

            _bucketReady = true;
        }
        finally
        {
            InitLock.Release();
        }
    }

    // Tarayıcının dosyayı doğru açması için içerik türü (uzantıdan)
    private static string GuessMime(string fileName) => Path.GetExtension(fileName).ToLowerInvariant() switch
    {
        ".jpg" or ".jpeg" => "image/jpeg",
        ".png" => "image/png",
        ".gif" => "image/gif",
        ".webp" => "image/webp",
        ".pdf" => "application/pdf",
        ".mp4" => "video/mp4",
        ".webm" => "video/webm",
        _ => "application/octet-stream",
    };
}
