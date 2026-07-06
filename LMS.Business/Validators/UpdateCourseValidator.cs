using FluentValidation;
using LMS.DTO.Courses;

namespace LMS.Business.Validators;

public class UpdateCourseValidator : AbstractValidator<UpdateCourseDto>
{
    public UpdateCourseValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Kurs başlığı boş olamaz.")
            .MaximumLength(200).WithMessage("Kurs başlığı en fazla 200 karakter olabilir.");

        RuleFor(x => x.Description)
            .NotEmpty().WithMessage("Kurs açıklaması boş olamaz.")
            .MaximumLength(2000).WithMessage("Kurs açıklaması en fazla 2000 karakter olabilir.");
    }
}
