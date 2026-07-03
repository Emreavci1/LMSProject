using AutoMapper;
using LMS.Business.Common;
using LMS.DataAccess.Repositories;
using LMS.DTO.Users;
using LMS.Entities;
using LMS.Entities.Enums;
using Microsoft.AspNetCore.Identity;

namespace LMS.Business.Services;

public class UserService : IUserService
{
    private readonly IUserRepository _userRepository;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly IMapper _mapper;

    public UserService(IUserRepository userRepository, IPasswordHasher<User> passwordHasher, IMapper mapper)
    {
        _userRepository = userRepository;
        _passwordHasher = passwordHasher;
        _mapper = mapper;
    }

    public async Task<List<UserDto>> GetAllAsync()
    {
        var users = await _userRepository.GetAllAsync();
        return _mapper.Map<List<UserDto>>(users);
    }

    public async Task<ServiceResult<UserDto>> CreateAsync(CreateUserDto dto)
    {
        // Aynı email ile kayıtlı kullanıcı var mı?
        var existing = await _userRepository.GetByEmailAsync(dto.Email);
        if (existing is not null)
            return ServiceResult<UserDto>.Fail(ServiceErrorType.Validation, "Bu email ile kayıtlı bir kullanıcı zaten var.");

        var user = new User
        {
            FullName = dto.FullName,
            Email = dto.Email,
            Role = Enum.Parse<UserRole>(dto.Role), // validator geçerliliğini garanti etti
            AvatarUrl = dto.AvatarUrl,
            IsActive = true,
            CreatedDate = DateTime.UtcNow
        };
        user.PasswordHash = _passwordHasher.HashPassword(user, dto.Password);

        await _userRepository.AddAsync(user);
        await _userRepository.SaveChangesAsync();

        return ServiceResult<UserDto>.Ok(_mapper.Map<UserDto>(user));
    }

    public async Task<ServiceResult<UserDto>> UpdateAsync(int id, UpdateUserDto dto)
    {
        var user = await _userRepository.GetByIdAsync(id);
        if (user is null)
            return ServiceResult<UserDto>.Fail(ServiceErrorType.NotFound, "Kullanıcı bulunamadı.");

        // Email değiştiyse, yeni email başkası tarafından kullanılıyor olmasın
        if (!string.Equals(user.Email, dto.Email, StringComparison.OrdinalIgnoreCase))
        {
            var emailOwner = await _userRepository.GetByEmailAsync(dto.Email);
            if (emailOwner is not null)
                return ServiceResult<UserDto>.Fail(ServiceErrorType.Validation, "Bu email ile kayıtlı başka bir kullanıcı var.");
        }

        user.FullName = dto.FullName;
        user.Email = dto.Email;
        user.Role = Enum.Parse<UserRole>(dto.Role);
        user.IsActive = dto.IsActive;
        user.AvatarUrl = dto.AvatarUrl;

        // Şifre yalnızca gönderildiyse değişir
        if (!string.IsNullOrWhiteSpace(dto.Password))
            user.PasswordHash = _passwordHasher.HashPassword(user, dto.Password);

        _userRepository.Update(user);
        await _userRepository.SaveChangesAsync();

        return ServiceResult<UserDto>.Ok(_mapper.Map<UserDto>(user));
    }

    public async Task<ServiceResult> DeactivateAsync(int id, int currentUserId)
    {
        // Admin kendi hesabını pasifleştirip sistemi kilitleyemesin
        if (id == currentUserId)
            return ServiceResult.Fail(ServiceErrorType.Validation, "Kendi hesabınızı pasifleştiremezsiniz.");

        var user = await _userRepository.GetByIdAsync(id);
        if (user is null)
            return ServiceResult.Fail(ServiceErrorType.NotFound, "Kullanıcı bulunamadı.");

        // Soft delete: kayıt silinmez, pasifleştirilir
        user.IsActive = false;
        _userRepository.Update(user);
        await _userRepository.SaveChangesAsync();

        return ServiceResult.Ok();
    }
}
