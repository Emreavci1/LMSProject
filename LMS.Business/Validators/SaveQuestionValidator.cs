using FluentValidation;
using LMS.DTO.Exams;
using LMS.Entities.Enums;

namespace LMS.Business.Validators;

public class SaveQuestionValidator : AbstractValidator<SaveQuestionDto>
{
    public SaveQuestionValidator()
    {
        RuleFor(x => x.Text)
            .NotEmpty().WithMessage("Soru metni boş olamaz.")
            .MaximumLength(2000).WithMessage("Soru en fazla 2000 karakter olabilir.");

        // Tip geçerli bir enum değeri olmalı ("MultipleChoice" | "OpenEnded")
        RuleFor(x => x.Type)
            .Must(t => Enum.TryParse<QuestionType>(t, out _))
            .WithMessage("Geçersiz soru tipi.");

        // Çoktan seçmeli sorularda: en az 2 şık ve tam olarak işaretlenmiş
        // en az 1 doğru şık olmalı (otomatik puanlama buna dayanır).
        When(IsMultipleChoice, () =>
        {
            RuleFor(x => x.Options)
                .Must(o => o.Count >= 2)
                .WithMessage("Çoktan seçmeli soruda en az 2 şık olmalı.")
                .Must(o => o.Any(opt => opt.IsCorrect))
                .WithMessage("En az bir şık doğru olarak işaretlenmeli.");

            RuleForEach(x => x.Options).SetValidator(new SaveQuestionOptionValidator());
        });
    }

    private static bool IsMultipleChoice(SaveQuestionDto q)
        => string.Equals(q.Type, nameof(QuestionType.MultipleChoice), StringComparison.OrdinalIgnoreCase);
}
