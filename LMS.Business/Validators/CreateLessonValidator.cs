using FluentValidation;
using LMS.DTO.Lessons;

namespace LMS.Business.Validators;

public class CreateLessonValidator : AbstractValidator<CreateLessonDto>
{
    public CreateLessonValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Ders başlığı boş olamaz.")
            .MaximumLength(200).WithMessage("Ders başlığı en fazla 200 karakter olabilir.");

        RuleFor(x => x.Section)
            .MaximumLength(150).WithMessage("Bölüm adı en fazla 150 karakter olabilir.");

        RuleFor(x => x.DurationMin)
            .GreaterThanOrEqualTo(0).WithMessage("Süre negatif olamaz.");

        RuleFor(x => x.Notes)
            .MaximumLength(4000).WithMessage("Ders notları en fazla 4000 karakter olabilir.");

        // Okuma metni (Text) dersinde metin zorunlu
        RuleFor(x => x.TextContent)
            .NotEmpty().WithMessage("Okuma metni boş olamaz.")
            .When(x => IsTextType(x.ContentType));

        // Video/Document dersinde içerik bağlantısı (URL) zorunlu
        RuleFor(x => x.ContentUrl)
            .NotEmpty().WithMessage("İçerik bağlantısı (URL) boş olamaz.")
            .When(x => !IsTextType(x.ContentType));
    }

    private static bool IsTextType(string? contentType)
        => string.Equals(contentType, "Text", StringComparison.OrdinalIgnoreCase);
}
