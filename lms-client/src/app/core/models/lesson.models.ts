// Ders (Lesson) DTO karşılıkları — backend LMS.DTO.Lessons ile birebir

export type LessonContentType = 'Video' | 'Document' | 'Text';

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
