using LMS.Business.Services;
using LMS.DTO.Uploads;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LMS.Api.Controllers;

// Ders içerik dosyası yükleme (foto / sunum-PDF / video).
// Dosya diske kaydedilir, cevapta dönen göreli URL ders oluştururken
// ContentUrl alanına yazılır. Yalnızca eğitmen ve admin yükleyebilir.
[ApiController]
[Route("api/uploads")]
[Authorize(Roles = "Instructor,Admin")]
public class UploadController : ApiControllerBase
{
    private readonly IFileStorageService _fileStorage;

    public UploadController(IFileStorageService fileStorage)
    {
        _fileStorage = fileStorage;
    }

    // POST /api/uploads  (multipart/form-data: file + contentType)
    // contentType: "Image" | "Document" | "Video" — sınır ve uzantı kuralları tipe göre.
    // Varsayılan istek gövdesi sınırı (~30 MB) video için yetmez; buradan yükseltiyoruz.
    [HttpPost]
    [RequestSizeLimit(320_000_000)]
    [RequestFormLimits(MultipartBodyLengthLimit = 320_000_000)]
    public async Task<ActionResult<UploadResultDto>> Upload(IFormFile? file, [FromForm] string contentType)
    {
        if (file is null)
            return BadRequest(new { message = "Dosya gönderilmedi." });

        await using var stream = file.OpenReadStream();
        var result = await _fileStorage.SaveAsync(stream, file.FileName, file.Length, contentType);

        if (!result.Success)
            return ToErrorResponse(result);

        return Ok(result.Data);
    }
}
