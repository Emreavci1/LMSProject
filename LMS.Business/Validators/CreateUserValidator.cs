using FluentValidation;
using LMS.DTO.Users;
using LMS.Entities.Enums;

namespace LMS.Business.Validators;

public class CreateUserValidator : AbstractValidator<CreateUserDto>
{
    public CreateUserValidator()
    {
        RuleFor(x => x.FullName)
            .NotEmpty().WithMessage("Ad soyad boş olamaz.")
            .MaximumLength(150).WithMessage("Ad soyad en fazla 150 karakter olabilir.");

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email boş olamaz.")
            .EmailAddress().WithMessage("Geçerli bir email adresi girin.")
            .MaximumLength(200).WithMessage("Email en fazla 200 karakter olabilir.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Şifre boş olamaz.")
            .MinimumLength(8).WithMessage("Şifre en az 8 karakter olmalı.");

        RuleFor(x => x.Role)
            .NotEmpty().WithMessage("Rol boş olamaz.")
            .Must(BeAValidRole).WithMessage("Rol şunlardan biri olmalı: CourseAttendee, Instructor, Admin.");
    }

    // Gönderilen string, UserRole enum'ındaki bir isme karşılık geliyor mu?
    private static bool BeAValidRole(string role)
        => Enum.TryParse<UserRole>(role, ignoreCase: false, out _);
}
