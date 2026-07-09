namespace LMS.Entities.Enums;

// Ders içeriğinin türü.
// Link bir URL ile, Text doğrudan metinle tutulur.
// Video/Document/Image dosya yükleme ile çalışacak (depolama altyapısı yakında);
// eski Video dersleri URL (YouTube) ile kaydedilmişti, oynatıcı bunları desteklemeye devam eder.
public enum LessonContentType
{
    Video = 0,
    Document = 1,
    Text = 2,
    Link = 3,
    Image = 4
}
