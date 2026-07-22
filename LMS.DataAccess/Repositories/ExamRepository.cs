using LMS.Entities;
using Microsoft.EntityFrameworkCore;

namespace LMS.DataAccess.Repositories;

public class ExamRepository : Repository<Exam>, IExamRepository
{
    public ExamRepository(LmsDbContext context) : base(context)
    {
    }

    // Sınav sırası: önce Order, eşitse ekleniş sırası (Id)
    public async Task<List<Exam>> GetByCourseAsync(int courseId)
        => await _dbSet
            .Include(e => e.Questions)   // soru sayısı (QuestionCount) için
            .Where(e => e.CourseId == courseId)
            .OrderBy(e => e.Order)
            .ThenBy(e => e.Id)
            .ToListAsync();

    public async Task<Exam?> GetByIdWithDetailsAsync(int examId)
        => await _dbSet
            .Include(e => e.Questions.OrderBy(q => q.Order).ThenBy(q => q.Id))
                .ThenInclude(q => q.Options.OrderBy(o => o.Order).ThenBy(o => o.Id))
            .FirstOrDefaultAsync(e => e.Id == examId);

    // Yalnızca ilerleme hesabı için: sınavların Id/CourseId'si (soru/şık yüklenmez)
    public async Task<List<Exam>> GetByCoursesAsync(List<int> courseIds)
        => await _dbSet
            .Where(e => courseIds.Contains(e.CourseId))
            .ToListAsync();

    // Rapor için: sorularıyla (yalnızca tip lazım; şıklar yüklenmez)
    public async Task<List<Exam>> GetByCoursesWithQuestionsAsync(List<int> courseIds)
        => await _dbSet
            .Include(e => e.Questions)
            .Where(e => courseIds.Contains(e.CourseId))
            .ToListAsync();
}
