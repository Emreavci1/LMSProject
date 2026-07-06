// UI-first geliştirme için zengin mock modeller.
// Backend bu alanları destekleyince gerçek DTO'larla değiştirilecek.

// Kursun yayın durumu: taslak sadece eğitmene görünür, yayında herkese açık,
// zamanlanmış ise publishDate gelince yayına alınır.
export type CourseStatus = 'Draft' | 'Published' | 'Scheduled';

export interface MockCourse {
  id: number;
  title: string;
  description: string;
  category: string;
  level: 'Başlangıç' | 'Orta' | 'İleri';
  durationHours: number;
  lessonCount: number;
  instructorName: string;
  students: number;
  rating: number;
  isActive: boolean;
  // Kapak: gradient string ("linear-gradient(...)") veya görsel dataURL/URL olabilir
  cover: string;
  // Yayın iş akışı
  status: CourseStatus;
  publishDate?: string; // ISO tarih — zamanlanmış yayın için
}

export interface MockLesson {
  id: number;
  courseId: number;
  section: string;
  title: string;
  description?: string; // Opsiyonel ders açıklaması
  durationMin: number;
  // Materyal tipi ve içeriği (opsiyonel — seed derslerde yok, oluşturulanlarda dolu)
  contentType?: 'Video' | 'Document' | 'Text';
  contentUrl?: string;
  textContent?: string;
}

export interface MockTransaction {
  date: string;
  description: string;
  amount: number; // + yükleme, - harcama
}

export interface MockScheduleEvent {
  day: number; // 0 = Pazartesi
  start: string;
  end: string;
  title: string;
  color: string;
}

export interface MockActivity {
  icon: string;
  text: string;
  time: string;
}

export interface MockStudentProgress {
  fullName: string;
  email: string;
  progress: number; // 0-100
  enrollDate: string;
}
