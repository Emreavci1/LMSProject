using System.Linq.Expressions;

namespace LMS.DataAccess.Repositories;

// Tüm entity'ler için ortak veritabanı işlemleri.
// Service katmanı DbContext'e doğrudan dokunmaz, bu arayüzü kullanır.
public interface IRepository<T> where T : class
{
    Task<T?> GetByIdAsync(int id);
    Task<List<T>> GetAllAsync(Expression<Func<T, bool>>? filter = null);
    Task AddAsync(T entity);
    void Update(T entity);
    void Remove(T entity);
    void RemoveRange(IEnumerable<T> entities);
    Task<int> SaveChangesAsync();
}
