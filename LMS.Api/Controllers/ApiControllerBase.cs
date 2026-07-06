using System.Security.Claims;
using LMS.Business.Common;
using Microsoft.AspNetCore.Mvc;

namespace LMS.Api.Controllers;

// Tüm controller'ların ortak atası:
// token'dan kullanıcı bilgisi okuma ve ServiceResult → HTTP kodu çevirisi burada
public abstract class ApiControllerBase : ControllerBase
{
    // JWT token'ındaki kullanıcı Id claim'i
    protected int CurrentUserId
        => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    protected bool IsAdmin
        => User.IsInRole("Admin");

    // Service'ten dönen hata tipini doğru HTTP cevabına çevirir
    protected ActionResult ToErrorResponse(ServiceResult result)
    {
        var body = new { message = result.Error };
        return result.ErrorType switch
        {
            ServiceErrorType.NotFound => NotFound(body),          // 404
            ServiceErrorType.Forbidden => StatusCode(403, body),  // 403
            _ => BadRequest(body)                                 // 400
        };
    }
}
