namespace LMS.Entities.Enums;

// Soru tipi.
// MultipleChoice: çoktan seçmeli — doğru şık bellidir, otomatik puanlanır.
// OpenEnded: açık uçlu — yazılı cevap, eğitmen/admin elle değerlendirir.
public enum QuestionType
{
    MultipleChoice = 0,
    OpenEnded = 1
}
