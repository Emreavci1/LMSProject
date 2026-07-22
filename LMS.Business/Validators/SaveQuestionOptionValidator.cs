using FluentValidation;
using LMS.DTO.Exams;

namespace LMS.Business.Validators;

public class SaveQuestionOptionValidator : AbstractValidator<SaveQuestionOptionDto>
{
    public SaveQuestionOptionValidator()
    {
        RuleFor(x => x.Text)
            .NotEmpty().WithMessage("Şık metni boş olamaz.")
            .MaximumLength(1000).WithMessage("Şık en fazla 1000 karakter olabilir.");
    }
}
