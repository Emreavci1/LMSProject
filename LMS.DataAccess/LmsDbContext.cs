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
    }
}
