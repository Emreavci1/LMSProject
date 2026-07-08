namespace LMS.DTO.Lessons;

// Müfredat sırasını güncellemek için: derslerin istenen sıradaki id listesi.
// Servis, listedeki sıraya göre her dersin Order alanını yeniden atar.
public class ReorderLessonsDto
{
    public List<int> LessonIds { get; set; } = new();
}
