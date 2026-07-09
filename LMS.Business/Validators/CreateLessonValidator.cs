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

        // Ders özeti (kısa yazılı anlatım)
        RuleFor(x => x.Description)
            .MaximumLength(2000).WithMessage("Ders özeti en fazla 2000 karakter olabilir.");

        RuleFor(x => x.Notes)
            .MaximumLength(4000).WithMessage("Ders notları en fazla 4000 karakter olabilir.");

        // Okuma metni (Text) dersinde metin zorunlu
        RuleFor(x => x.TextContent)
            .NotEmpty().WithMessage("Okuma metni boş olamaz.")
            .When(x => IsType(x.ContentType, "Text"));

        // URL bağlantısı (Link) dersinde adres zorunlu.
        // Video/Document/Image dosya yükleme ile çalışacak (depolama yakında) —
        // şimdilik içeriksiz kaydedilebilirler, bu yüzden onlarda URL zorunlu değil.
        RuleFor(x => x.ContentUrl)
            .NotEmpty().WithMessage("Bağlantı adresi (URL) boş olamaz.")
            .When(x => IsType(x.ContentType, "Link"));
    }

    private static bool IsType(string? contentType, string expected)
        => string.Equals(contentType, expected, StringComparison.OrdinalIgnoreCase);
}
