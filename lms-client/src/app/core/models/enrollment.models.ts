// Katılım (enrollment) DTO karşılıkları

// GET /api/enrollments/my cevabı (EnrollmentDto)
export interface Enrollment {
  id: number;
  courseId: number;
  courseTitle: string;
  instructorName: string;
  enrollDate: string;
}

// GET /api/enrollments/course/{id} cevabı (CourseAttendeeDto)
export interface CourseAttendee {
  userId: number;
  fullName: string;
  email: string;
  enrollDate: string;
  // İlerleme yüzdesi (0-100): tamamlanan ders / kurstaki toplam ders
  progress: number;
}
