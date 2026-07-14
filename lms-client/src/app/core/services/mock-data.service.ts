import { Injectable, signal } from '@angular/core';
import {
  MockActivity,
  MockCourse,
  MockScheduleEvent,
  MockStudentProgress,
} from '../models/mock.models';

// GEÇİCİ: UI-first geliştirme için sahte veri merkezi.
// Backend genişletilince bu servis gerçek API servisleriyle değiştirilecek.
// Katılma/tamamlama durumları signal'lerde tutulur — sayfa yenilenince sıfırlanır.
@Injectable({ providedIn: 'root' })
export class MockDataService {
  // --- Kurslar ---
  // GEÇİCİ: Admin panelindeki "Tüm Kurslar" / "Kategoriler" / "Genel Bakış" sayfaları
  // henüz backend'e bağlanmadığı için bu göstermelik veriyi kullanır.
  readonly courses = signal<MockCourse[]>([
    { id: 1, title: 'Temel Bilgisayar Kullanımı', description: 'Bilgisayara yeni başlayanlar için dosya yönetimi, internet ve ofis programlarına giriş.', category: 'Teknoloji', level: 'Başlangıç', durationHours: 8, lessonCount: 6, instructorName: 'Eğitmen Bir', students: 42, rating: 4.6, isActive: true, status: 'Published', cover: 'linear-gradient(135deg, #0284C7, #0F172A)' },
    { id: 2, title: 'Çocuklarda Beslenme ve Sağlık', description: 'Tedavi sürecindeki çocuklar için doğru beslenme ilkeleri ve pratik öneriler.', category: 'Sağlık', level: 'Başlangıç', durationHours: 6, lessonCount: 5, instructorName: 'Eğitmen İki', students: 87, rating: 4.9, isActive: true, status: 'Published', cover: 'linear-gradient(135deg, #16A34A, #0F172A)' },
    { id: 3, title: 'Etkili İletişim Teknikleri', description: 'Aile ve hasta iletişiminde empati, dinleme ve doğru ifade becerileri.', category: 'Kişisel Gelişim', level: 'Orta', durationHours: 10, lessonCount: 8, instructorName: 'Eğitmen Bir', students: 65, rating: 4.7, isActive: true, status: 'Published', cover: 'linear-gradient(135deg, #7C3AED, #0F172A)' },
  ]);

  // Kategoriler: localStorage'da kalıcı (backend kategori tablosu olana kadar).
  // Kurs oluşturma formu ve admin kategori yönetimi bu listeyi kullanır.
  readonly categories = signal<string[]>(
    JSON.parse(localStorage.getItem('lms-categories') ?? 'null') ?? [
      'Genel', 'Sağlık', 'Teknoloji', 'Kişisel Gelişim', 'Sanat',
    ]
  );

  // --- Eğitmen programı (haftalık) ---
  readonly scheduleEvents = signal<MockScheduleEvent[]>([
    { day: 0, start: '10:00', end: '12:00', title: 'Temel Bilgisayar — Canlı Ders', color: '#0284C7' },
    { day: 1, start: '14:00', end: '15:30', title: 'İletişim Teknikleri — Soru/Cevap', color: '#7C3AED' },
    { day: 3, start: '09:30', end: '11:00', title: 'Excel Atölyesi', color: '#16A34A' },
    { day: 4, start: '13:00', end: '14:00', title: 'Öğrenci Görüşmeleri', color: '#F59E0B' },
  ]);

  // --- Admin analitik ---
  readonly monthlyEnrollments = signal<{ month: string; count: number }[]>([
    { month: 'Oca', count: 18 }, { month: 'Şub', count: 25 }, { month: 'Mar', count: 32 },
    { month: 'Nis', count: 28 }, { month: 'May', count: 41 }, { month: 'Haz', count: 55 },
    { month: 'Tem', count: 47 },
  ]);

  readonly recentActivities = signal<MockActivity[]>([
    { icon: 'person_add', text: 'Yeni katılımcı eklendi: Ayşe Yılmaz', time: '12 dk önce' },
    { icon: 'school', text: '"İlk Yardım Temelleri" kursuna 3 yeni kayıt', time: '1 saat önce' },
    { icon: 'check_circle', text: 'Mehmet Kaya "Excel ile Veri Analizi" kursunu tamamladı', time: '3 saat önce' },
    { icon: 'add_circle', text: 'Eğitmen Bir yeni kurs açtı: "Zaman Yönetimi"', time: 'Dün' },
    { icon: 'edit', text: '"Resim ile Terapi" kurs içeriği güncellendi', time: 'Dün' },
  ]);

  // Eğitmenin kursuna kayıtlı öğrenciler (Öğrenciler sekmesi için)
  readonly courseStudents = signal<MockStudentProgress[]>([
    { fullName: 'Ayşe Yılmaz', email: 'ayse@losev.org.tr', progress: 83, enrollDate: '2026-05-12' },
    { fullName: 'Mehmet Kaya', email: 'mehmet@losev.org.tr', progress: 100, enrollDate: '2026-04-28' },
    { fullName: 'Zeynep Demir', email: 'zeynep@losev.org.tr', progress: 45, enrollDate: '2026-06-01' },
    { fullName: 'Ali Çelik', email: 'ali@losev.org.tr', progress: 12, enrollDate: '2026-06-20' },
    { fullName: 'Fatma Şahin', email: 'fatma@losev.org.tr', progress: 67, enrollDate: '2026-05-18' },
  ]);

  // --- İşlemler ---
  addCourse(course: Omit<MockCourse, 'id' | 'students' | 'rating' | 'isActive'>): MockCourse {
    const newCourse: MockCourse = {
      ...course,
      id: Math.max(...this.courses().map((c) => c.id)) + 1,
      students: 0,
      rating: 0,
      // Yalnızca yayınlanan kurs canlı (aktif) olur; taslak/zamanlanmış değil
      isActive: course.status === 'Published',
    };
    this.courses.update((list) => [newCourse, ...list]);
    return newCourse;
  }

  // Kapak değeri gradient ise doğrudan, görsel (dataURL/URL) ise url() ile sarmalanır.
  // Böylece hem [style.background] hem [style.backgroundImage] her iki tipte de çalışır.
  coverCss(cover: string): string {
    if (!cover) return '';
    const isGradient = cover.startsWith('linear-gradient') || cover.startsWith('radial-gradient');
    if (isGradient || cover.startsWith('url(')) return cover;
    return `url('${cover}')`;
  }

  // Bir kursu yayına al (taslaktan yayına geçiş) — aynı anda canlı (aktif) yapılır
  publishCourse(courseId: number): void {
    this.courses.update((list) =>
      list.map((c) =>
        c.id === courseId ? { ...c, status: 'Published' as const, isActive: true } : c
      )
    );
  }

  toggleCourseActive(courseId: number): void {
    this.courses.update((list) =>
      list.map((c) => (c.id === courseId ? { ...c, isActive: !c.isActive } : c))
    );
  }

  addCategory(name: string): void {
    if (!this.categories().includes(name)) {
      this.categories.update((list) => [...list, name]);
      this.persistCategories();
    }
  }

  removeCategory(name: string): void {
    this.categories.update((list) => list.filter((c) => c !== name));
    this.persistCategories();
  }

  private persistCategories(): void {
    localStorage.setItem('lms-categories', JSON.stringify(this.categories()));
  }
}
