using FluentValidation;
using LMS.DTO.Enrollments;

namespace LMS.Business.Validators;

public class AssignEnrollmentValidator : AbstractValidator<AssignEnrollmentDto>
{
    public AssignEnrollmentValidator()
    {
        RuleFor(x => x.UserId)
            .GreaterThan(0).WithMessage("Geçerli bir kullanıcı seçin.");

        RuleFor(x => x.CourseId)
            .GreaterThan(0).WithMessage("Geçerli bir kurs seçin.");

        RuleFor(x => x.DueDate)
            .NotEmpty().WithMessage("Son tamamlama tarihi zorunludur.")
            // Artık saat de seçiliyor: son tarih "şu an"dan ileride olmalı
            .GreaterThan(_ => DateTime.UtcNow)
            .WithMessage("Son tamamlama tarihi geçmiş bir zaman olamaz.");
    }
}
