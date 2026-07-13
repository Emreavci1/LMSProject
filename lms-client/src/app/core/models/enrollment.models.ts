// Katılım (enrollment) DTO karşılıkları

// GET /api/enrollments/my cevabı (EnrollmentDto)
export interface Enrollment {
  id: number;
  courseId: number;
  courseTitle: string;
  instructorName: string;
  enrollDate: string;
  // Admin ataması mı (zorunlu eğitim)? Atanmış kayıttan ayrılınamaz
  isAssigned: boolean;
  // Zorunlu eğitimin son tamamlama tarihi (yalnızca atamalarda dolu)
  dueDate?: string | null;
}

// GET /api/enrollments/course/{id} cevabı (CourseAttendeeDto)
export interface CourseAttendee {
  userId: number;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  enrollDate: string;
  // İlerleme yüzdesi (0-100): tamamlanan ders / kurstaki toplam ders
  progress: number;
  // Admin ataması mı, gönüllü katılım mı?
  isAssigned: boolean;
  // Son tamamlama tarihi (yalnızca atamalarda dolu)
  dueDate?: string | null;
  // Gecikmiş: son tarih geçti ve ilerleme < %100 (backend hesaplar)
  isOverdue: boolean;
}

// POST /api/enrollments/assign isteği (AssignEnrollmentDto) — yalnızca Admin
export interface AssignEnrollment {
  userId: number;
  courseId: number;
  dueDate: string; // ISO tarih+saat (UTC)
}

// GET /api/users/{id}/enrollments cevabı (UserEnrollmentDto) — Admin kullanıcı detayı
export interface UserEnrollment {
  courseId: number;
  courseTitle: string;
  category?: string | null;
  instructorName: string;
  enrollDate: string;
  isAssigned: boolean;
  dueDate?: string | null;
  isOverdue: boolean;
  progress: number;
}
