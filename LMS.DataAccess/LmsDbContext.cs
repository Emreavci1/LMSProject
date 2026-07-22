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
    public DbSet<Announcement> Announcements => Set<Announcement>();
    public DbSet<Category> Categories => Set<Category>();

    // --- Sınav sistemi ---
    public DbSet<Exam> Exams => Set<Exam>();
    public DbSet<Question> Questions => Set<Question>();
    public DbSet<QuestionOption> QuestionOptions => Set<QuestionOption>();
    public DbSet<ExamAttempt> ExamAttempts => Set<ExamAttempt>();
    public DbSet<ExamAnswer> ExamAnswers => Set<ExamAnswer>();

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

        // --- Announcement ---
        modelBuilder.Entity<Announcement>(entity =>
        {
            entity.Property(a => a.Title).HasMaxLength(200).IsRequired();
            entity.Property(a => a.Content).HasMaxLength(4000).IsRequired();

            // Eğer kursa aitse kurs silinince duyurular da silinsin
            entity.HasOne(a => a.Course)
                  .WithMany()
                  .HasForeignKey(a => a.CourseId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(a => a.Author)
                  .WithMany()
                  .HasForeignKey(a => a.AuthorId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // --- Category ---
        modelBuilder.Entity<Category>(entity =>
        {
            entity.Property(c => c.Name).HasMaxLength(100).IsRequired();

            // Aynı adla iki kategori olamaz
            entity.HasIndex(c => c.Name).IsUnique();
        });

        // --- Exam ---
        modelBuilder.Entity<Exam>(entity =>
        {
            entity.Property(e => e.Title).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(2000);
            // Deneme hakkı varsayılan 1 (mevcut/ileriki kayıtlarda DEFAULT 1)
            entity.Property(e => e.MaxAttempts).HasDefaultValue(1);

            // Sınav kursa aittir; kurs silinince sınavları da silinsin (Cascade)
            entity.HasOne(e => e.Course)
                  .WithMany(c => c.Exams)
                  .HasForeignKey(e => e.CourseId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // --- Question ---
        modelBuilder.Entity<Question>(entity =>
        {
            entity.Property(q => q.Text).HasMaxLength(2000).IsRequired();

            // Soru sınava aittir; sınav silinince soruları da silinsin (Cascade)
            entity.HasOne(q => q.Exam)
                  .WithMany(e => e.Questions)
                  .HasForeignKey(q => q.ExamId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // --- QuestionOption ---
        modelBuilder.Entity<QuestionOption>(entity =>
        {
            entity.Property(o => o.Text).HasMaxLength(1000).IsRequired();

            // Şık soruya aittir; soru silinince şıkları da silinsin (Cascade)
            entity.HasOne(o => o.Question)
                  .WithMany(q => q.Options)
                  .HasForeignKey(o => o.QuestionId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // --- ExamAttempt ---
        modelBuilder.Entity<ExamAttempt>(entity =>
        {
            // Deneme sınava aittir; sınav silinince denemeleri de silinsin (Cascade)
            entity.HasOne(a => a.Exam)
                  .WithMany(e => e.Attempts)
                  .HasForeignKey(a => a.ExamId)
                  .OnDelete(DeleteBehavior.Cascade);

            // Öğrenci tarafında Restrict (LessonCompletion ile aynı yaklaşım):
            // kullanıcı soft-delete edilir, denemeleri korunur.
            entity.HasOne(a => a.User)
                  .WithMany()
                  .HasForeignKey(a => a.UserId)
                  .OnDelete(DeleteBehavior.Restrict);

            // Değerlendiren (eğitmen/admin) — opsiyonel; cascade YOK (çoklu yol olmasın)
            entity.HasOne(a => a.EvaluatedBy)
                  .WithMany()
                  .HasForeignKey(a => a.EvaluatedById)
                  .OnDelete(DeleteBehavior.NoAction);
        });

        // --- ExamAnswer ---
        modelBuilder.Entity<ExamAnswer>(entity =>
        {
            // Cevap denemeye aittir; deneme silinince cevapları da silinsin (Cascade)
            entity.HasOne(ans => ans.Attempt)
                  .WithMany(a => a.Answers)
                  .HasForeignKey(ans => ans.AttemptId)
                  .OnDelete(DeleteBehavior.Cascade);

            // Soru ve seçilen şık yalnızca referans — cascade YOK ki tabloya
            // birden çok cascade yolu oluşmasın (SQL Server buna izin vermez).
            // Silme sırası service katmanında yönetilir.
            entity.HasOne(ans => ans.Question)
                  .WithMany()
                  .HasForeignKey(ans => ans.QuestionId)
                  .OnDelete(DeleteBehavior.NoAction);

            entity.HasOne(ans => ans.SelectedOption)
                  .WithMany()
                  .HasForeignKey(ans => ans.SelectedOptionId)
                  .OnDelete(DeleteBehavior.NoAction);
        });
    }
}
