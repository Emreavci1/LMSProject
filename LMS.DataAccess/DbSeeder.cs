using LMS.Entities;
using LMS.Entities.Enums;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace LMS.DataAccess;

// Uygulama ilk ayağa kalktığında çalışır:
// bekleyen migration'ları uygular ve ilk Admin kullanıcısını oluşturur.
public static class DbSeeder
{
    public static async Task SeedAsync(LmsDbContext context, IPasswordHasher<User> passwordHasher)
    {
        // Bekleyen migration varsa uygula (veritabanı yoksa oluşturur)
        await context.Database.MigrateAsync();

        // Sistemde hiç Admin yoksa ilk Admin'i oluştur
        if (!await context.Users.AnyAsync(u => u.Role == UserRole.Admin))
        {
            var admin = new User
            {
                FullName = "Sistem Yöneticisi",
                Email = "admin@losev.org.tr",
                Role = UserRole.Admin,
                IsActive = true,
                CreatedDate = DateTime.UtcNow
            };

            // Şifre hash'lenerek saklanır (düz metin asla kaydedilmez)
            admin.PasswordHash = passwordHasher.HashPassword(admin, "Admin123!");

            context.Users.Add(admin);
            await context.SaveChangesAsync();
        }
    }
}
