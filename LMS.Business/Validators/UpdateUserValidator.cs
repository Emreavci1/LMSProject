using FluentValidation;
using LMS.DTO.Users;
using LMS.Entities.Enums;

namespace LMS.Business.Validators;

public class UpdateUserValidator : AbstractValidator<UpdateUserDto>
{
    public UpdateUserValidator()
    {
        RuleFor(x => x.FullName)
            .NotEmpty().WithMessage("Ad soyad boş olamaz.")
            .MaximumLength(150).WithMessage("Ad soyad en fazla 150 karakter olabilir.");

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email boş olamaz.")
            .EmailAddress().WithMessage("Geçerli bir email adresi girin.")
            .MaximumLength(200).WithMessage("Email en fazla 200 karakter olabilir.");

        // Şifre opsiyonel; ama gönderildiyse kurala uymalı
        RuleFor(x => x.Password)
            .MinimumLength(8).WithMessage("Şifre en az 8 karakter olmalı.")
            .When(x => !string.IsNullOrWhiteSpace(x.Password));

        RuleFor(x => x.Role)
            .NotEmpty().WithMessage("Rol boş olamaz.")
            .Must(role => Enum.TryParse<UserRole>(role, ignoreCase: false, out _))
            .WithMessage("Rol şunlardan biri olmalı: CourseAttendee, Instructor, Admin.");
    }
}
