// Ders (Lesson) DTO karşılıkları — backend LMS.DTO.Lessons ile birebir

// Link: URL bağlantısı, Text: okuma metni.
// Video/Document/Image dosya yükleme ile çalışacak (depolama altyapısı yakında);
// eski Video dersleri URL (YouTube) ile kaydedildi, oynatıcı desteklemeye devam eder.
export type LessonContentType = 'Link' | 'Image' | 'Text' | 'Document' | 'Video';

// GET /api/courses/{courseId}/lessons cevabı (LessonDto)
export interface Lesson {
  id: number;
  courseId: number;
  section: string;
  title: string;
  description?: string | null;
  durationMin: number;
  contentType: LessonContentType;
  contentUrl?: string | null;
  textContent?: string | null;
  // Eğitmenin ders notları (oynatıcıdaki "Notlar" sekmesi)
  notes?: string | null;
  order: number;
}

// POST /api/courses/{courseId}/lessons isteği (CreateLessonDto)
export interface CreateLesson {
  section: string;
  title: string;
  description?: string | null;
  durationMin: number;
  contentType: LessonContentType;
  contentUrl?: string | null;
  textContent?: string | null;
  notes?: string | null;
}
