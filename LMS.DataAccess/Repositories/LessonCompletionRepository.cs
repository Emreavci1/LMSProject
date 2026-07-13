using LMS.Entities;
using Microsoft.EntityFrameworkCore;

namespace LMS.DataAccess.Repositories;

public class LessonCompletionRepository : Repository<LessonCompletion>, ILessonCompletionRepository
{
    public LessonCompletionRepository(LmsDbContext context) : base(context)
    {
    }

    public async Task<LessonCompletion?> GetByUserAndLessonAsync(int userId, int lessonId)
        => await _dbSet.FirstOrDefaultAsync(lc => lc.UserId == userId && lc.LessonId == lessonId);

    public async Task<List<int>> GetLessonIdsByUserAsync(int userId)
        => await _dbSet
            .Where(lc => lc.UserId == userId)
            .Select(lc => lc.LessonId)
            .ToListAsync();

    public async Task<Dictionary<int, int>> GetCompletedCountsByCourseAsync(int courseId)
        => await _dbSet
            .Where(lc => lc.Lesson.CourseId == courseId)
            .GroupBy(lc => lc.UserId)
            .Select(g => new { UserId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.UserId, x => x.Count);

    public async Task<Dictionary<int, List<int>>> GetCompletedLessonIdsByCourseAsync(int courseId)
    {
        // Ağırlıklı (ders yükü) ilerleme için sayı yetmez: hangi derslerin
        // tamamlandığı gerekir — kullanıcı başına ders id listesi döner
        var rows = await _dbSet
            .Where(lc => lc.Lesson.CourseId == courseId)
            .Select(lc => new { lc.UserId, lc.LessonId })
            .ToListAsync();

        return rows
            .GroupBy(r => r.UserId)
            .ToDictionary(g => g.Key, g => g.Select(r => r.LessonId).ToList());
    }
}
