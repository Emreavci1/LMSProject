using AutoMapper;
using LMS.Business.Common;
using LMS.DataAccess.Repositories;
using LMS.DTO.Exams;
using LMS.Entities;
using LMS.Entities.Enums;

namespace LMS.Business.Services;

public class ExamService : IExamService
{
    private readonly IExamRepository _examRepository;
    private readonly ICourseRepository _courseRepository;
    private readonly IMapper _mapper;

    public ExamService(
        IExamRepository examRepository,
        ICourseRepository courseRepository,
        IMapper mapper)
    {
        _examRepository = examRepository;
        _courseRepository = courseRepository;
        _mapper = mapper;
    }

    public async Task<ServiceResult<List<ExamListItemDto>>> GetByCourseAsync(int courseId)
    {
        var course = await _courseRepository.GetByIdAsync(courseId);
        if (course is null)
            return ServiceResult<List<ExamListItemDto>>.Fail(ServiceErrorType.NotFound, "Kurs bulunamadı.");

        var exams = await _examRepository.GetByCourseAsync(courseId);
        return ServiceResult<List<ExamListItemDto>>.Ok(_mapper.Map<List<ExamListItemDto>>(exams));
    }

    public async Task<ServiceResult<ExamDto>> GetByIdAsync(int courseId, int examId, int currentUserId, bool isAdmin)
    {
        // Doğru cevapları içerdiği için sahiplik kontrolü şart
        var (_, error) = await LoadOwnedCourseAsync(courseId, currentUserId, isAdmin);
        if (error is not null)
            return ServiceResult<ExamDto>.Fail(error.Value.Type, error.Value.Message);

        var exam = await _examRepository.GetByIdWithDetailsAsync(examId);
        if (exam is null || exam.CourseId != courseId)
            return ServiceResult<ExamDto>.Fail(ServiceErrorType.NotFound, "Sınav bulunamadı.");

        return ServiceResult<ExamDto>.Ok(_mapper.Map<ExamDto>(exam));
    }

    public async Task<ServiceResult<ExamDto>> CreateAsync(int courseId, SaveExamDto dto, int currentUserId, bool isAdmin)
    {
        var (_, error) = await LoadOwnedCourseAsync(courseId, currentUserId, isAdmin);
        if (error is not null)
            return ServiceResult<ExamDto>.Fail(error.Value.Type, error.Value.Message);

        // Yeni sınav müfredatın sonuna eklenir (dersler gibi)
        var existing = await _examRepository.GetByCourseAsync(courseId);
        var nextOrder = existing.Count == 0 ? 0 : existing.Max(e => e.Order) + 1;

        var exam = new Exam
        {
            CourseId = courseId,
            Title = dto.Title.Trim(),
            Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim(),
            TimeLimitMin = dto.TimeLimitMin,
            MaxAttempts = dto.MaxAttempts,
            Order = nextOrder,
            CreatedDate = DateTime.UtcNow
        };

        foreach (var question in BuildQuestions(dto.Questions))
            exam.Questions.Add(question);

        await _examRepository.AddAsync(exam);
        await _examRepository.SaveChangesAsync();

        // Id'lerin dolu olması için detayıyla geri yükle
        var saved = await _examRepository.GetByIdWithDetailsAsync(exam.Id);
        return ServiceResult<ExamDto>.Ok(_mapper.Map<ExamDto>(saved));
    }

    public async Task<ServiceResult<ExamDto>> UpdateAsync(int courseId, int examId, SaveExamDto dto, int currentUserId, bool isAdmin)
    {
        var (_, error) = await LoadOwnedCourseAsync(courseId, currentUserId, isAdmin);
        if (error is not null)
            return ServiceResult<ExamDto>.Fail(error.Value.Type, error.Value.Message);

        // Sınavı takip edilir (tracked) halde, soruları + şıklarıyla yükle
        var exam = await _examRepository.GetByIdWithDetailsAsync(examId);
        if (exam is null || exam.CourseId != courseId)
            return ServiceResult<ExamDto>.Fail(ServiceErrorType.NotFound, "Sınav bulunamadı.");

        // NOT: Faz 2'de henüz deneme (attempt) yok. İleride denemesi olan sınavın
        // sorularını değiştirmek cevap kayıtlarını bozabileceği için Faz 3/4'te
        // burada "denemesi varsa yeniden yazmayı engelle" koruması eklenecek.

        exam.Title = dto.Title.Trim();
        exam.Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim();
        exam.TimeLimitMin = dto.TimeLimitMin;
        exam.MaxAttempts = dto.MaxAttempts;

        // Sorular bütün olarak yenilenir: eski soru/şıklar silinir (EF cascade ile),
        // yerlerine gönderilenler eklenir. Böylece güncelleme çok basit kalır.
        exam.Questions.Clear();
        foreach (var question in BuildQuestions(dto.Questions))
            exam.Questions.Add(question);

        await _examRepository.SaveChangesAsync();

        var saved = await _examRepository.GetByIdWithDetailsAsync(exam.Id);
        return ServiceResult<ExamDto>.Ok(_mapper.Map<ExamDto>(saved));
    }

    public async Task<ServiceResult> DeleteAsync(int courseId, int examId, int currentUserId, bool isAdmin)
    {
        var (_, error) = await LoadOwnedCourseAsync(courseId, currentUserId, isAdmin);
        if (error is not null)
            return ServiceResult.Fail(error.Value.Type, error.Value.Message);

        var exam = await _examRepository.GetByIdAsync(examId);
        if (exam is null || exam.CourseId != courseId)
            return ServiceResult.Fail(ServiceErrorType.NotFound, "Sınav bulunamadı.");

        // Sorular/şıklar EF cascade ile birlikte silinir
        _examRepository.Remove(exam);
        await _examRepository.SaveChangesAsync();
        return ServiceResult.Ok();
    }

    // SaveQuestionDto listesini Question entity'lerine çevirir (Order = liste sırası).
    // Şıklar yalnızca çoktan seçmeli sorularda oluşturulur.
    private static List<Question> BuildQuestions(List<SaveQuestionDto> dtos)
    {
        var questions = new List<Question>();
        for (var i = 0; i < dtos.Count; i++)
        {
            var qd = dtos[i];
            // Tip geçerliliğini validator garanti eder
            var type = Enum.Parse<QuestionType>(qd.Type, ignoreCase: true);

            var question = new Question
            {
                Type = type,
                Text = qd.Text.Trim(),
                Order = i,
                CreatedDate = DateTime.UtcNow
            };

            if (type == QuestionType.MultipleChoice)
            {
                for (var j = 0; j < qd.Options.Count; j++)
                {
                    var od = qd.Options[j];
                    question.Options.Add(new QuestionOption
                    {
                        Text = od.Text.Trim(),
                        IsCorrect = od.IsCorrect,
                        Order = j
                    });
                }
            }

            questions.Add(question);
        }
        return questions;
    }

    // Kursu yükler ve sahiplik kontrolü yapar (LessonService ile aynı desen).
    private async Task<(Course? course, (ServiceErrorType Type, string Message)? error)> LoadOwnedCourseAsync(
        int courseId, int currentUserId, bool isAdmin)
    {
        var course = await _courseRepository.GetByIdAsync(courseId);
        if (course is null)
            return (null, (ServiceErrorType.NotFound, "Kurs bulunamadı."));

        // SAHİPLİK KONTROLÜ: Instructor yalnızca kendi kursunun sınavlarını yönetebilir
        if (!isAdmin && course.InstructorId != currentUserId)
            return (null, (ServiceErrorType.Forbidden, "Bu kurs üzerinde yetkiniz yok."));

        return (course, null);
    }
}
