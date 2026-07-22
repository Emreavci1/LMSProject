using FluentValidation;
using LMS.DTO.Lessons;

namespace LMS.Business.Validators;

public class UpdateLessonValidator : AbstractValidator<UpdateLessonDto>
{
    public UpdateLessonValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Ders başlığı boş olamaz.")
            .MaximumLength(200).WithMessage("Ders başlığı en fazla 200 karakter olabilir.");
    }
}
