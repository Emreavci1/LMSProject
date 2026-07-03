using FluentValidation;
using LMS.DTO.Enrollments;

namespace LMS.Business.Validators;

public class CreateEnrollmentValidator : AbstractValidator<CreateEnrollmentDto>
{
    public CreateEnrollmentValidator()
    {
        RuleFor(x => x.CourseId)
            .GreaterThan(0).WithMessage("Geçerli bir kurs seçin.");
    }
}
