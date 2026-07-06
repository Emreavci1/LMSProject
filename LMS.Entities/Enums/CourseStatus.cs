namespace LMS.Entities.Enums;

// Kursun yayın durumu. Veritabanında int olarak saklanır.
public enum CourseStatus
{
    Draft = 0,      // Taslak — yalnızca eğitmen görür, öğrencilere açılmaz
    Published = 1,  // Yayında — öğrencilere açık
    Scheduled = 2   // Zamanlanmış — PublishDate gelince yayına alınır
}
