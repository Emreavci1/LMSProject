using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;

namespace LMS.DataAccess.Repositories;

// IRepository'nin EF Core ile çalışan genel (generic) implementasyonu
public class Repository<T> : IRepository<T> where T : class
{
    protected readonly LmsDbContext _context;
    protected readonly DbSet<T> _dbSet;

    public Repository(LmsDbContext context)
    {
        _context = context;
        _dbSet = context.Set<T>();
    }

    public async Task<T?> GetByIdAsync(int id)
        => await _dbSet.FindAsync(id);

    public async Task<List<T>> GetAllAsync(Expression<Func<T, bool>>? filter = null)
    {
        IQueryable<T> query = _dbSet;
        if (filter != null)
            query = query.Where(filter);
        return await query.ToListAsync();
    }

    public async Task AddAsync(T entity)
        => await _dbSet.AddAsync(entity);

    public void Update(T entity)
        => _dbSet.Update(entity);

    public void Remove(T entity)
        => _dbSet.Remove(entity);

    public void RemoveRange(IEnumerable<T> entities)
        => _dbSet.RemoveRange(entities);

    public async Task<int> SaveChangesAsync()
        => await _context.SaveChangesAsync();
}
