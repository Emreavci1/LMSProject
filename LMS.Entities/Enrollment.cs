namespace LMS.Entities;

// Bir kullanıcının bir kursa katılım kaydı
public class Enrollment
{
    public int Id { get; set; }

    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public int CourseId { get; set; }
    public Course Course { get; set; } = null!;

    public DateTime EnrollDate { get; set; } = DateTime.UtcNow;

    // Not: Aynı kullanıcı aynı kursa iki kez kayıt olamaz.
    // Bu kural DbContext'te unique index ile garanti altına alınır.
}
