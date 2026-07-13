// Kurs ile ilgili DTO karşılıkları (backend LMS.DTO.Courses ile birebir)

export type CourseStatus = 'Draft' | 'Published' | 'Scheduled';

// GET /api/courses cevabı (CourseDto)
export interface Course {
  id: number;
  title: string;
  description: string;
  instructorId: number;
  instructorName: string;
  coverImageUrl?: string | null;
  category?: string | null;
  level?: string | null;
  durationHours: number;
  // Göstermelik toplam süre (dakika) — derslerden 30 dk yuvarlanarak hesaplanır (backend)
  durationMinutes: number;
  lessonCount: number;
  // Kursa kayıtlı katılımcı sayısı
  studentCount: number;
  status: CourseStatus;
  publishDate?: string | null;
  isActive: boolean;
  // Zorunlu eğitim: katalogda listelenmez, katılım yalnızca Admin atamasıyla
  isMandatory: boolean;
  // Kurum eğitimi: kursu açan Admin (katılımcı arayüzünde rozetle öne çıkar)
  isOfficial: boolean;
  createdDate: string;
}

// POST /api/courses isteği (CreateCourseDto).
// Sayısal alanlar opsiyonel — gönderilmezse backend 0 kabul eder (eski form uyumu).
export interface CreateCourse {
  title: string;
  description: string;
  coverImageUrl?: string | null;
  category?: string | null;
  level?: string | null;
  durationHours?: number;
  lessonCount?: number;
  status?: CourseStatus;
  publishDate?: string | null;
  // Yalnızca Admin gönderirse dikkate alınır (backend kuralı)
  isMandatory?: boolean;
}

// PUT /api/courses/{id} isteği (UpdateCourseDto)
export interface UpdateCourse {
  title: string;
  description: string;
  coverImageUrl?: string | null;
  category?: string | null;
  level?: string | null;
  durationHours?: number;
  lessonCount?: number;
  status?: CourseStatus;
  publishDate?: string | null;
  isActive?: boolean;
  // Yalnızca Admin gönderirse dikkate alınır; gönderilmezse korunur
  isMandatory?: boolean;
}
