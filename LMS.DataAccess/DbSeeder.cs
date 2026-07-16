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

        // Varsayılan eğitim kategorileri (tablo boşsa bir kez eklenir).
        // Eski localStorage tabanlı listeyle aynı başlangıç seti.
        if (!await context.Categories.AnyAsync())
        {
            var defaultNames = new[] { "Genel", "Sağlık", "Teknoloji", "Kişisel Gelişim", "Sanat" };
            context.Categories.AddRange(defaultNames.Select(name => new Category { Name = name }));
            await context.SaveChangesAsync();
        }

        // Frontend login ekranındaki "hızlı giriş" test kullanıcıları (login.ts).
        // Sadece geliştirme kolaylığı için; production'a geçerken kaldırılmalı.
        await SeedTestUserAsync(context, passwordHasher, "egitmen1@losev.org.tr", "Egitmen123!", "Test Eğitmen", UserRole.Instructor);
        await SeedTestUserAsync(context, passwordHasher, "katilimci1@losev.org.tr", "Katilimci123!", "Test Katılımcı 1", UserRole.CourseAttendee);
        await SeedTestUserAsync(context, passwordHasher, "katilimci2@losev.org.tr", "Katilimci123!", "Test Katılımcı 2", UserRole.CourseAttendee);
        await SeedTestUserAsync(context, passwordHasher, "katilimci3@losev.org.tr", "Katilimci123!", "Test Katılımcı 3", UserRole.CourseAttendee);
    }

    private static async Task SeedTestUserAsync(
        LmsDbContext context,
        IPasswordHasher<User> passwordHasher,
        string email,
        string password,
        string fullName,
        UserRole role)
    {
        if (await context.Users.AnyAsync(u => u.Email == email))
        {
            return;
        }

        var user = new User
        {
            FullName = fullName,
            Email = email,
            Role = role,
            IsActive = true,
            CreatedDate = DateTime.UtcNow
        };

        user.PasswordHash = passwordHasher.HashPassword(user, password);

        context.Users.Add(user);
        await context.SaveChangesAsync();
    }
}
