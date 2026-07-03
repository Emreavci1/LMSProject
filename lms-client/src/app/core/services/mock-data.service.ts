import { Injectable, computed, effect, signal } from '@angular/core';
import {
  MockActivity,
  MockCourse,
  MockLesson,
  MockScheduleEvent,
  MockStudentProgress,
  MockTransaction,
} from '../models/mock.models';

// GEÇİCİ: UI-first geliştirme için sahte veri merkezi.
// Backend genişletilince bu servis gerçek API servisleriyle değiştirilecek.
// Katılma/tamamlama durumları signal'lerde tutulur — sayfa yenilenince sıfırlanır.
@Injectable({ providedIn: 'root' })
export class MockDataService {
  // --- Kurslar ---
  readonly courses = signal<MockCourse[]>([
    { id: 1, title: 'Temel Bilgisayar Kullanımı', description: 'Bilgisayara yeni başlayanlar için dosya yönetimi, internet ve ofis programlarına giriş.', category: 'Teknoloji', level: 'Başlangıç', durationHours: 8, lessonCount: 6, instructorName: 'Eğitmen Bir', students: 42, rating: 4.6, isActive: true, status: 'Published', cover: 'linear-gradient(135deg, #0284C7, #0F172A)' },
    { id: 2, title: 'Çocuklarda Beslenme ve Sağlık', description: 'Tedavi sürecindeki çocuklar için doğru beslenme ilkeleri ve pratik öneriler.', category: 'Sağlık', level: 'Başlangıç', durationHours: 6, lessonCount: 5, instructorName: 'Eğitmen İki', students: 87, rating: 4.9, isActive: true, status: 'Published', cover: 'linear-gradient(135deg, #16A34A, #0F172A)' },
    { id: 3, title: 'Etkili İletişim Teknikleri', description: 'Aile ve hasta iletişiminde empati, dinleme ve doğru ifade becerileri.', category: 'Kişisel Gelişim', level: 'Orta', durationHours: 10, lessonCount: 8, instructorName: 'Eğitmen Bir', students: 65, rating: 4.7, isActive: true, status: 'Published', cover: 'linear-gradient(135deg, #7C3AED, #0F172A)' },
    { id: 4, title: 'Resim ile Terapi Atölyesi', description: 'Sanat yoluyla duygusal ifade — temel çizim ve boyama teknikleri.', category: 'Sanat', level: 'Başlangıç', durationHours: 5, lessonCount: 4, instructorName: 'Eğitmen İki', students: 31, rating: 4.8, isActive: true, status: 'Published', cover: 'linear-gradient(135deg, #DC2626, #0F172A)' },
    { id: 5, title: 'Excel ile Veri Analizi', description: 'Tablolar, formüller, pivot ve grafiklerle kurum içi raporlama.', category: 'Teknoloji', level: 'Orta', durationHours: 12, lessonCount: 9, instructorName: 'Eğitmen Bir', students: 54, rating: 4.5, isActive: true, status: 'Published', cover: 'linear-gradient(135deg, #0369A1, #16A34A)' },
    { id: 6, title: 'İlk Yardım Temelleri', description: 'Acil durumlarda hayat kurtaran temel ilk yardım bilgisi ve uygulamaları.', category: 'Sağlık', level: 'Başlangıç', durationHours: 4, lessonCount: 5, instructorName: 'Eğitmen İki', students: 120, rating: 4.9, isActive: true, status: 'Published', cover: 'linear-gradient(135deg, #DC2626, #F59E0B)' },
    { id: 7, title: 'Zaman Yönetimi ve Planlama', description: 'Önceliklendirme, hedef koyma ve verimli çalışma alışkanlıkları.', category: 'Kişisel Gelişim', level: 'Başlangıç', durationHours: 7, lessonCount: 6, instructorName: 'Eğitmen Bir', students: 48, rating: 4.4, isActive: true, status: 'Published', cover: 'linear-gradient(135deg, #F59E0B, #0F172A)' },
    { id: 8, title: 'Müzikle Tanışma: Ritim ve Melodi', description: 'Çocuklar ve gönüllüler için temel müzik eğitimi ve ritim çalışmaları.', category: 'Sanat', level: 'Başlangıç', durationHours: 6, lessonCount: 5, instructorName: 'Eğitmen İki', students: 27, rating: 4.6, isActive: true, status: 'Published', cover: 'linear-gradient(135deg, #0284C7, #7C3AED)' },
  ]);

  readonly categories = signal<string[]>(['Genel', 'Sağlık', 'Teknoloji', 'Kişisel Gelişim', 'Sanat']);

  // --- Dersler (kurs başına bölümlere ayrılmış) ---
  readonly lessons = signal<MockLesson[]>([
    // Kurs 1
    { id: 101, courseId: 1, section: 'Giriş', title: 'Bilgisayarı Tanıyalım', durationMin: 18 },
    { id: 102, courseId: 1, section: 'Giriş', title: 'Klavye ve Fare Kullanımı', durationMin: 22 },
    { id: 103, courseId: 1, section: 'Temeller', title: 'Dosya ve Klasör Yönetimi', durationMin: 25 },
    { id: 104, courseId: 1, section: 'Temeller', title: 'İnternette Güvenli Gezinme', durationMin: 30 },
    { id: 105, courseId: 1, section: 'Uygulama', title: 'Word ile İlk Belgem', durationMin: 28 },
    { id: 106, courseId: 1, section: 'Uygulama', title: 'E-posta Kullanımı', durationMin: 20 },
    // Kurs 2
    { id: 201, courseId: 2, section: 'Temel Bilgiler', title: 'Beslenmenin Önemi', durationMin: 15 },
    { id: 202, courseId: 2, section: 'Temel Bilgiler', title: 'Besin Grupları', durationMin: 20 },
    { id: 203, courseId: 2, section: 'Uygulama', title: 'Günlük Menü Planlama', durationMin: 25 },
    { id: 204, courseId: 2, section: 'Uygulama', title: 'Tedavi Sürecinde Beslenme', durationMin: 30 },
    { id: 205, courseId: 2, section: 'Uygulama', title: 'Sık Yapılan Hatalar', durationMin: 18 },
    // Kurs 3
    { id: 301, courseId: 3, section: 'Kavramlar', title: 'İletişim Nedir?', durationMin: 15 },
    { id: 302, courseId: 3, section: 'Kavramlar', title: 'Empati ve Aktif Dinleme', durationMin: 25 },
    { id: 303, courseId: 3, section: 'Teknikler', title: 'Beden Dili', durationMin: 20 },
    { id: 304, courseId: 3, section: 'Teknikler', title: 'Zor Konuşmalar', durationMin: 30 },
    { id: 305, courseId: 3, section: 'Teknikler', title: 'Geri Bildirim Verme', durationMin: 22 },
    { id: 306, courseId: 3, section: 'Uygulama', title: 'Hasta Aileleriyle İletişim', durationMin: 35 },
    { id: 307, courseId: 3, section: 'Uygulama', title: 'Vaka Çalışmaları', durationMin: 40 },
    { id: 308, courseId: 3, section: 'Uygulama', title: 'Değerlendirme', durationMin: 15 },
  ]);

  // --- Eğitmenin oluşturduğu GERÇEK kursların dersleri ---
  // Backend'de ders modülü yok (spec gereği). Seed demo derslerinden (yukarıdaki `lessons`)
  // AYRI tutulur ki gerçek kurs id'leri (1,2,3...) seed courseId'leriyle ÇAKIŞMASIN.
  // localStorage'a yazılır ki sayfa yenilense de eklenen dersler kaybolmasın.
  private readonly MANAGED_KEY = 'lms_managed_lessons';
  readonly managedLessons = signal<MockLesson[]>(this.loadManaged());

  constructor() {
    // managedLessons her değiştiğinde localStorage'a kaydet
    effect(() => this.saveManaged(this.managedLessons()));
  }

  private loadManaged(): MockLesson[] {
    try {
      const raw = localStorage.getItem(this.MANAGED_KEY);
      return raw ? (JSON.parse(raw) as MockLesson[]) : [];
    } catch {
      return [];
    }
  }

  private saveManaged(list: MockLesson[]): void {
    try {
      localStorage.setItem(this.MANAGED_KEY, JSON.stringify(list));
    } catch {
      /* localStorage yoksa sessizce geç */
    }
  }

  // Gerçek bir kursa ait dersler (Yönet sayfası bunu kullanır)
  managedLessonsOf(courseId: number): MockLesson[] {
    return this.managedLessons().filter((l) => l.courseId === courseId);
  }

  // Kurs silinince derslerini de temizle
  removeManagedLessonsOf(courseId: number): void {
    this.managedLessons.update((list) => list.filter((l) => l.courseId !== courseId));
  }

  // --- Öğrencinin katılım/ilerleme durumu (oturum içi) ---
  readonly enrolledCourseIds = signal<Set<number>>(new Set([1, 3]));
  readonly completedLessonIds = signal<Set<number>>(new Set([101, 102, 103, 301]));

  // --- Bakiye ---
  readonly balance = signal(250);
  readonly transactions = signal<MockTransaction[]>([
    { date: '2026-06-28', description: 'Bakiye yükleme', amount: 200 },
    { date: '2026-06-15', description: 'Hediye bakiye (LÖSEV)', amount: 100 },
    { date: '2026-06-10', description: 'Etkinlik katılım iadesi', amount: 50 },
    { date: '2026-05-30', description: 'Atölye malzeme ücreti', amount: -100 },
  ]);

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

  // --- Türetilmiş değerler ---
  readonly enrolledCourses = computed(() =>
    this.courses().filter((c) => this.enrolledCourseIds().has(c.id))
  );

  // --- İşlemler ---
  enroll(courseId: number): void {
    const next = new Set(this.enrolledCourseIds());
    next.add(courseId);
    this.enrolledCourseIds.set(next);
  }

  isEnrolled(courseId: number): boolean {
    return this.enrolledCourseIds().has(courseId);
  }

  toggleLessonCompleted(lessonId: number): void {
    const next = new Set(this.completedLessonIds());
    if (next.has(lessonId)) next.delete(lessonId);
    else next.add(lessonId);
    this.completedLessonIds.set(next);
  }

  lessonsOf(courseId: number): MockLesson[] {
    return this.lessons().filter((l) => l.courseId === courseId);
  }

  // Kurs ilerlemesi: tamamlanan ders / toplam ders (yüzde)
  progressOf(courseId: number): number {
    const lessons = this.lessonsOf(courseId);
    if (lessons.length === 0) return 0;
    const done = lessons.filter((l) => this.completedLessonIds().has(l.id)).length;
    return Math.round((done / lessons.length) * 100);
  }

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
    }
  }

  removeCategory(name: string): void {
    this.categories.update((list) => list.filter((c) => c !== name));
  }
}
