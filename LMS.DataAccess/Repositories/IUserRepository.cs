using LMS.Entities;

namespace LMS.DataAccess.Repositories;

// User'a özel sorgular (generic repository'nin üzerine ekler)
public interface IUserRepository : IRepository<User>
{
    Task<User?> GetByEmailAsync(string email);
}
