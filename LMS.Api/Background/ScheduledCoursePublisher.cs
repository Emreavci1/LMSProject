using LMS.DataAccess.Repositories;
using LMS.Entities.Enums;

namespace LMS.Api.Background;

// Arka plan servisi: yayın tarihi gelmiş "Zamanlanmış" kursları otomatik yayınlar.
// Uygulama ayakta olduğu sürece 1 dakikada bir kontrol eder.
public class ScheduledCoursePublisher : BackgroundService
{
    private static readonly TimeSpan CheckInterval = TimeSpan.FromMinutes(1);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ScheduledCoursePublisher> _logger;

    public ScheduledCoursePublisher(IServiceScopeFactory scopeFactory, ILogger<ScheduledCoursePublisher> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                // Repository scoped olduğundan her turda kısa ömürlü bir scope açılır
                using var scope = _scopeFactory.CreateScope();
                var courseRepository = scope.ServiceProvider.GetRequiredService<ICourseRepository>();

                var dueCourses = await courseRepository.GetDueScheduledAsync();
                foreach (var course in dueCourses)
                {
                    course.Status = CourseStatus.Published;
                    courseRepository.Update(course);
                    _logger.LogInformation("Zamanlanmış kurs otomatik yayınlandı: {Title} (Id={Id})", course.Title, course.Id);
                }

                if (dueCourses.Count > 0)
                    await courseRepository.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                // Tek turdaki hata servisi durdurmasın; sonraki turda tekrar denenir
                _logger.LogError(ex, "Zamanlanmış kurs yayınlama kontrolü başarısız oldu.");
            }

            await Task.Delay(CheckInterval, stoppingToken);
        }
    }
}
