using LMS.Business.Services;
using LMS.DTO.Uploads;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LMS.Api.Controllers;

// Kullanıcının KENDİ profili — tüm roller kullanabilir.
// (UserController Admin'e özel olduğu için profil işlemleri ayrı controller'da)
[ApiController]
[Route("api/profile")]
[Authorize]
public class ProfileController : ApiControllerBase
{
    // Profil fotoğrafı olarak seçilebilecek hazır (preset) avatarlar.
    // Görsellerin kendisi frontend'dedir; DB'de yalnızca bu kimlik saklanır.
    private static readonly string[] AllowedPresets =
        { "preset:male", "preset:female", "preset:neutral" };

    private readonly IUserService _userService;
    private readonly IFileStorageService _fileStorage;

    public ProfileController(IUserService userService, IFileStorageService fileStorage)
    {
        _userService = userService;
        _fileStorage = fileStorage;
    }

    // POST /api/profile/avatar — profil fotoğrafı yükle (multipart) ve profile ata
    [HttpPost("avatar")]
    public async Task<ActionResult<UploadResultDto>> UploadAvatar(IFormFile file)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { message = "Dosya seçilmedi." });

        // Ders içerikleriyle aynı doğrulama: yalnızca resim, 5MB sınırı
        await using var stream = file.OpenReadStream();
        var saved = await _fileStorage.SaveAsync(stream, file.FileName, file.Length, "Image");
        if (!saved.Success)
            return ToErrorResponse(saved);

        var result = await _userService.SetAvatarAsync(CurrentUserId, saved.Data!.Url);
        if (!result.Success)
            return ToErrorResponse(result);

        return Ok(saved.Data);
    }

    public record SetAvatarRequest(string? AvatarUrl);

    // PUT /api/profile/avatar — hazır avatar seç ("preset:...") veya fotoğrafı kaldır (null)
    [HttpPut("avatar")]
    public async Task<ActionResult> SetAvatar([FromBody] SetAvatarRequest request)
    {
        // Güvenlik: bu uçtan yalnızca preset/temizleme kabul edilir —
        // istemci keyfî URL yazamaz (dosya yükleme POST ucundan doğrulanarak geçer)
        if (request.AvatarUrl is not null && !AllowedPresets.Contains(request.AvatarUrl))
            return BadRequest(new { message = "Geçersiz avatar seçimi." });

        var result = await _userService.SetAvatarAsync(CurrentUserId, request.AvatarUrl);
        if (!result.Success)
            return ToErrorResponse(result);

        return NoContent();
    }
}
