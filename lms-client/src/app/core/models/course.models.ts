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
  lessonCount: number;
  status: CourseStatus;
  publishDate?: string | null;
  isActive: boolean;
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
}
