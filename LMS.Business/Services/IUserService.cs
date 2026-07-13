using LMS.Business.Common;
using LMS.DTO.Users;

namespace LMS.Business.Services;

// Kullanıcı yönetimi — yalnızca Admin kullanır
public interface IUserService
{
    Task<List<UserDto>> GetAllAsync();
    Task<ServiceResult<UserDto>> CreateAsync(CreateUserDto dto);
    Task<ServiceResult<UserDto>> UpdateAsync(int id, UpdateUserDto dto);
    Task<ServiceResult> DeactivateAsync(int id, int currentUserId);

    // Kullanıcının KENDİ profil fotoğrafını günceller (dosya URL'i / preset / null)
    Task<ServiceResult> SetAvatarAsync(int userId, string? avatarUrl);
}
