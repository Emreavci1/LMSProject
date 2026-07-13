using LMS.Entities;
using Microsoft.EntityFrameworkCore;

namespace LMS.DataAccess;

// EF Core'un veritabanıyla konuştuğu ana sınıf.
// Her DbSet bir tabloya karşılık gelir.
public class LmsDbContext : DbContext
{
    public LmsDbContext(DbContextOptions<LmsDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Course> Courses => Set<Course>();
    public DbSet<Enrollment> Enrollments => Set<Enrollment>();
    public DbSet<Lesson> Lessons => Set<Lesson>();
    public DbSet<LessonCompletion> LessonCompletions => Set<LessonCompletion>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // --- User ---
        modelBuilder.Entity<User>(entity =>
        {
            entity.Property(u => u.FullName).HasMaxLength(150).IsRequired();
            entity.Property(u => u.Email).HasMaxLength(200).IsRequired();
            entity.Property(u => u.PasswordHash).IsRequired();

            // Aynı email ile iki kullanıcı olamaz
            entity.HasIndex(u => u.Email).IsUnique();
        });

        // --- Course ---
        modelBuilder.Entity<Course>(entity =>
        {
            entity.Property(c => c.Title).HasMaxLength(200).IsRequired();
            entity.Property(c => c.Description).HasMaxLength(2000).IsRequired();

            // Bir kursun bir eğitmeni var; bir eğitmenin birden çok kursu olabilir.
            // Eğitmen silinirse kursları otomatik silinmesin (Restrict).
            entity.HasOne(c => c.Instructor)
                  .WithMany(u => u.Courses)
                  .HasForeignKey(c => c.InstructorId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // --- Enrollment ---
        modelBuilder.Entity<Enrollment>(entity =>
        {
            // Aynı kullanıcı aynı kursa iki kez kayıt olamaz
            entity.HasIndex(e => new { e.UserId, e.CourseId }).IsUnique();

            entity.HasOne(e => e.User)
                  .WithMany(u => u.Enrollments)
                  .HasForeignKey(e => e.UserId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Course)
                  .WithMany(c => c.Enrollments)
                  .HasForeignKey(e => e.CourseId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // --- Lesson ---
        modelBuilder.Entity<Lesson>(entity =>
        {
            entity.Property(l => l.Section).HasMaxLength(150).IsRequired();
            entity.Property(l => l.Title).HasMaxLength(200).IsRequired();
            // Ders özeti (kısa yazılı anlatım) — oynatıcının "Genel Bakış" sekmesinde gösterilir
            entity.Property(l => l.Description).HasMaxLength(2000);
            entity.Property(l => l.ContentUrl).HasMaxLength(1000);
            entity.Property(l => l.Notes).HasMaxLength(4000);
            // Ders yükü: mevcut kayıtlar dahil varsayılan 1 (migration'da DEFAULT 1)
            entity.Property(l => l.Weight).HasDefaultValue(1);
            // TextContent uzun olabilir (okuma metni) — sınır koymuyoruz (nvarchar(max))

            // Bir kursun birçok dersi olur. Kurs silinince dersleri de silinsin (Cascade):
            // ders, kursu olmadan var olamaz.
            entity.HasOne(l => l.Course)
                  .WithMany(c => c.Lessons)
                  .HasForeignKey(l => l.CourseId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // --- LessonCompletion ---
        modelBuilder.Entity<LessonCompletion>(entity =>
        {
            // Aynı kullanıcı aynı dersi iki kez "tamamlanmış" olarak işaretleyemez
            entity.HasIndex(lc => new { lc.UserId, lc.LessonId }).IsUnique();

            // Ders silinince tamamlama kayıtları da silinsin (kayıt dersi olmadan anlamsız)
            entity.HasOne(lc => lc.Lesson)
                  .WithMany()
                  .HasForeignKey(lc => lc.LessonId)
                  .OnDelete(DeleteBehavior.Cascade);

            // Kullanıcı tarafında Restrict (Enrollment ile aynı yaklaşım):
            // kullanıcı zaten soft-delete ile pasifleştiriliyor, kayıtları korunur.
            entity.HasOne(lc => lc.User)
                  .WithMany()
                  .HasForeignKey(lc => lc.UserId)
                  .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
