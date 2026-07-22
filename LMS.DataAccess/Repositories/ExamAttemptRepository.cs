using LMS.Entities;
using LMS.Entities.Enums;
using Microsoft.EntityFrameworkCore;

namespace LMS.DataAccess.Repositories;

public class ExamAttemptRepository : Repository<ExamAttempt>, IExamAttemptRepository
{
    public ExamAttemptRepository(LmsDbContext context) : base(context)
    {
    }

    public async Task<List<ExamAttempt>> GetByUserAndExamAsync(int userId, int examId)
        => await _dbSet
            .Where(a => a.UserId == userId && a.ExamId == examId)
            .OrderBy(a => a.StartedDate)
            .ToListAsync();

    public async Task<ExamAttempt?> GetActiveWithAnswersAsync(int userId, int examId)
        => await _dbSet
            .Include(a => a.Answers)
            .FirstOrDefaultAsync(a =>
                a.UserId == userId
                && a.ExamId == examId
                && a.Status == ExamAttemptStatus.InProgress);

    public async Task<ExamAttempt?> GetByIdWithAnswersAsync(int attemptId)
        => await _dbSet
            .Include(a => a.Answers)
            .FirstOrDefaultAsync(a => a.Id == attemptId);

    public async Task<List<ExamAttempt>> GetSubmittedByExamWithUserAsync(int examId)
        => await _dbSet
            .Include(a => a.User)
            .Where(a => a.ExamId == examId && a.Status != ExamAttemptStatus.InProgress)
            .OrderBy(a => a.SubmittedDate)
            .ToListAsync();

    public async Task<ExamAttempt?> GetByIdWithAnswersAndUserAsync(int attemptId)
        => await _dbSet
            .Include(a => a.Answers)
            .Include(a => a.User)
            .FirstOrDefaultAsync(a => a.Id == attemptId);

    public async Task<List<ExamAttempt>> GetSubmittedByCourseAsync(int courseId)
        => await _dbSet
            .Where(a => a.Exam.CourseId == courseId && a.Status != ExamAttemptStatus.InProgress)
            .ToListAsync();

    public async Task<List<ExamAttempt>> GetSubmittedByCoursesAsync(List<int> courseIds)
        => await _dbSet
            .Where(a => courseIds.Contains(a.Exam.CourseId) && a.Status != ExamAttemptStatus.InProgress)
            .ToListAsync();

    // "Gönderilmiş" = InProgress dışındaki her durum (Submitted / Evaluated)
    public async Task<Dictionary<int, List<int>>> GetSubmittedExamIdsByCourseAsync(int courseId)
    {
        var rows = await _dbSet
            .Where(a => a.Exam.CourseId == courseId && a.Status != ExamAttemptStatus.InProgress)
            .Select(a => new { a.UserId, a.ExamId })
            .Distinct()
            .ToListAsync();

        return rows
            .GroupBy(r => r.UserId)
            .ToDictionary(g => g.Key, g => g.Select(r => r.ExamId).Distinct().ToList());
    }

    public async Task<List<int>> GetSubmittedExamIdsByUserAsync(int userId)
        => await _dbSet
            .Where(a => a.UserId == userId && a.Status != ExamAttemptStatus.InProgress)
            .Select(a => a.ExamId)
            .Distinct()
            .ToListAsync();

    public async Task<Dictionary<(int CourseId, int UserId), List<int>>> GetSubmittedExamIdsByCoursesAsync(List<int> courseIds)
    {
        var rows = await _dbSet
            .Where(a => courseIds.Contains(a.Exam.CourseId) && a.Status != ExamAttemptStatus.InProgress)
            .Select(a => new { a.Exam.CourseId, a.UserId, a.ExamId })
            .Distinct()
            .ToListAsync();

        return rows
            .GroupBy(r => (r.CourseId, r.UserId))
            .ToDictionary(g => g.Key, g => g.Select(r => r.ExamId).Distinct().ToList());
    }
}
