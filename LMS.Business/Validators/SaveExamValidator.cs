using FluentValidation;
using LMS.DTO.Exams;

namespace LMS.Business.Validators;

public class SaveExamValidator : AbstractValidator<SaveExamDto>
{
    public SaveExamValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Sınav başlığı boş olamaz.")
            .MaximumLength(200).WithMessage("Sınav başlığı en fazla 200 karakter olabilir.");

        RuleFor(x => x.Description)
            .MaximumLength(2000).WithMessage("Sınav açıklaması en fazla 2000 karakter olabilir.");

        // Süre sınırı opsiyonel; verildiyse 1-600 dk (10 saat) arası
        RuleFor(x => x.TimeLimitMin)
            .InclusiveBetween(1, 600).WithMessage("Süre 1-600 dakika arası olmalı.")
            .When(x => x.TimeLimitMin.HasValue);

        RuleFor(x => x.MaxAttempts)
            .InclusiveBetween(1, 20).WithMessage("Deneme hakkı 1-20 arası olmalı.");

        // Sınavın en az 1 sorusu olmalı
        RuleFor(x => x.Questions)
            .Must(q => q.Count >= 1).WithMessage("Sınavda en az bir soru olmalı.");

        RuleForEach(x => x.Questions).SetValidator(new SaveQuestionValidator());
    }
}
