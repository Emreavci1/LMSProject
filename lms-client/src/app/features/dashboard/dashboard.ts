import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, map, of, switchMap } from 'rxjs';
import {
  CalendarEvent,
  EventCalendar,
  timeLabel,
} from '../../shared/components/event-calendar/event-calendar';
import { AuthService } from '../../core/services/auth.service';
import { Course } from '../../core/models/course.models';
import { CourseService } from '../../core/services/course.service';
import { EnrollmentService } from '../../core/services/enrollment.service';
import { LessonService } from '../../core/services/lesson.service';
import { ProgressService } from '../../core/services/progress.service';
import { coverCss } from '../../core/utils/cover.util';
import { formatCourseHours, formatDuration } from '../../core/utils/duration.util';

// Öğrenci ana sayfası kartı: katılınan kurs + ders bilgileri
interface DashboardCard {
  id: number;
  title: string;
  category: string;
  cover: string; // CSS background değeri
  // Zorunlu eğitim ataması: son tarih takvimde ve yaklaşan etkinliklerde gösterilir
  isAssigned: boolean;
  dueDate?: string | null;
  // İlerleme (yük ağırlıklı) + öğrenme süresi hesabı için
  lessons: { id: number; durationMin: number; weight: number }[];
  playerLink: string[];
}

// Varsayılan kapak (gerçek kursta kapak yoksa)
const DEFAULT_COVER = 'linear-gradient(135deg, #0284C7, #0F172A)';

// Role göre farklı içerik gösteren ana sayfa (dashboard).
// Öğrenci için gerçek istatistikleri (katılınan/tamamlanan kurs, öğrenme süresi) hesaplar.
@Component({
  selector: 'app-dashboard',
  imports: [DatePipe, MatIconModule, RouterLink, EventCalendar],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  protected readonly auth = inject(AuthService);
  private router = inject(Router);

  private progressService = inject(ProgressService);
  private courseService = inject(CourseService);
  private enrollmentService = inject(EnrollmentService);
  private lessonService = inject(LessonService);

  // Katılımlar (API'den) — yalnızca öğrenci için çekilir
  readonly allCards = signal<DashboardCard[]>([]);

  // Eğitmenin açtığı kurslar (API'den) — yalnızca eğitmen için çekilir
  readonly myCourses = signal<Course[]>([]);

  // Yaklaşan (zamanlanmış) eğitimler — takvimde mavi işaret olarak gösterilir
  readonly upcomingCourses = signal<Course[]>([]);

  constructor() {
    // Admin'in ayrı bir ana sayfası yok: doğrudan Genel Bakış'a yönlendir
    if (this.auth.role() === 'Admin') {
      this.router.navigate(['/admin/overview'], { replaceUrl: true });
      return;
    }

    // Eğitmen: kendi kurslarını çek (istatistikler + eğitim listesi)
    if (this.auth.role() === 'Instructor') {
      this.courseService.getMyCourses().subscribe({
        next: (courses) => this.myCourses.set(courses),
        error: () => {
          /* liste boş kalır */
        },
      });
    }

    // Yalnızca öğrenci girişinde katılımları çek (Admin/Eğitmen için gereksiz)
    if (this.auth.role() === 'CourseAttendee') {
      // Tamamlanan dersler backend'den (ilerleme hesabı için)
      this.progressService.load();

      // Yaklaşan eğitimler (takvimdeki mavi yayın işaretleri)
      this.courseService.getUpcoming().subscribe({
        next: (courses) => this.upcomingCourses.set(courses),
        error: () => {
          /* takvim işaretsiz kalır */
        },
      });

      // Katılımlarım + yayındaki kurslar, ardından her kursun dersleri
      forkJoin({
        enrollments: this.enrollmentService.getMyEnrollments(),
        courses: this.courseService.getAll(),
      })
        .pipe(
          switchMap(({ enrollments, courses }) => {
            if (enrollments.length === 0) return of<DashboardCard[]>([]);
            return forkJoin(
              enrollments.map((e) => {
                const course = courses.find((c) => c.id === e.courseId);
                return this.lessonService.getByCourse(e.courseId).pipe(
                  map(
                    (lessons): DashboardCard => ({
                      id: e.courseId,
                      title: course?.title ?? e.courseTitle,
                      category: course?.category || 'Genel',
                      cover: coverCss(course?.coverImageUrl) || DEFAULT_COVER,
                      isAssigned: e.isAssigned,
                      dueDate: e.dueDate,
                      lessons: lessons.map((l) => ({ id: l.id, durationMin: l.durationMin, weight: l.weight || 1 })),
                      playerLink: ['/learn', String(e.courseId)],
                    })
                  )
                );
              })
            );
          })
        )
        .subscribe({
          next: (cards) => this.allCards.set(cards),
          error: () => {
            /* API hatası olsa da sayfa boş liste gösterir */
          },
        });
    }
  }

  // İlerleme: ders yükü (kredi) ağırlıklı — her render'da canlı hesaplanır
  progressOf(card: DashboardCard): number {
    const totalWeight = card.lessons.reduce((sum, l) => sum + l.weight, 0);
    if (totalWeight === 0) return 0;
    const doneWeight = card.lessons
      .filter((l) => this.progressService.completedLessonIds().has(l.id))
      .reduce((sum, l) => sum + l.weight, 0);
    return Math.round((doneWeight / totalWeight) * 100);
  }

  // Bu kartta tamamlanan derslerin GERÇEK dakika toplamı
  private completedMinutes(card: DashboardCard): number {
    return card.lessons
      .filter((l) => this.progressService.completedLessonIds().has(l.id))
      .reduce((sum, l) => sum + (l.durationMin || 0), 0);
  }

  // --- İstatistikler ---
  // Katılınan kurs sayısı
  readonly enrolledCount = computed(() => this.allCards().length);

  // Tamamlanan kurs sayısı (ilerleme %100)
  readonly completedCount = computed(
    () => this.allCards().filter((c) => this.progressOf(c) === 100).length
  );

  // Öğrenme süresi = tamamlanan derslerin GERÇEK dakika toplamı (göstermelik/yuvarlı değil)
  readonly totalLearningMinutes = computed(() =>
    this.allCards().reduce((sum, c) => sum + this.completedMinutes(c), 0)
  );
  readonly learningLabel = computed(() => formatDuration(this.totalLearningMinutes()));

  // Öğrenmeye devam et: yarım kalmış (0 < ilerleme < 100) ilk kurs;
  // yoksa henüz başlanmamış (ilerleme < 100) ilk kurs; hepsi bittiyse null.
  readonly continueCard = computed<DashboardCard | null>(() => {
    const cards = this.allCards();
    const inProgress = cards.find((c) => {
      const p = this.progressOf(c);
      return p > 0 && p < 100;
    });
    if (inProgress) return inProgress;
    return cards.find((c) => this.progressOf(c) < 100) ?? null;
  });

  // --- Eğitmen istatistikleri (kendi kurslarından hesaplanır) ---
  // Toplam katılımcı: kursların katılımcı sayıları toplamı
  readonly totalStudents = computed(() =>
    this.myCourses().reduce((sum, c) => sum + c.studentCount, 0)
  );

  // Toplam açılan eğitim (kurs) sayısı
  readonly totalCourseCount = computed(() => this.myCourses().length);

  // Toplam içerik süresi (takribi saat gösterimi — kurs süresi kuralıyla aynı)
  readonly totalContentLabel = computed(() =>
    formatCourseHours(this.myCourses().reduce((sum, c) => sum + c.durationMinutes, 0))
  );

  // Eğitmen kartlarında kapak CSS'i
  courseCover(course: Course): string {
    return coverCss(course.coverImageUrl);
  }

  // --- Yaklaşan etkinlikler + takvim (zorunlu eğitim son tarihleri) ---

  // Bitmemiş zorunlu eğitimlerin son tarihleri: en yakından uzağa, ilk 3
  readonly upcomingDeadlines = computed(() =>
    this.allCards()
      .filter((c) => c.isAssigned && c.dueDate && this.progressOf(c) < 100)
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 3)
  );

  // Son tarihe kalan gün (negatif = gecikti)
  private daysLeft(card: DashboardCard): number {
    const due = new Date(card.dueDate!);
    due.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.round((due.getTime() - now.getTime()) / 86_400_000);
  }

  isOverdue(card: DashboardCard): boolean {
    return this.daysLeft(card) < 0;
  }

  deadlineLabel(card: DashboardCard): string {
    const days = this.daysLeft(card);
    if (days < 0) return 'Süresi doldu — Başarısız';
    if (days === 0) return 'Bugün son gün';
    if (days === 1) return 'Yarın son gün';
    return `${days} gün kaldı`;
  }

  // Takvim olayları: zorunlu eğitim son tarihleri (kırmızı) + yaklaşan yayınlar (mavi).
  // Tooltip metinleri EventCalendar bileşenince hücrelere yazılır.
  readonly calendarEvents = computed<CalendarEvent[]>(() => [
    ...this.allCards()
      .filter((c) => c.isAssigned && c.dueDate)
      .map((c) => ({
        date: c.dueDate!,
        label: `Zorunlu eğitim son tarihi (${timeLabel(c.dueDate!)}): ${c.title}`,
        kind: 'deadline' as const,
      })),
    ...this.upcomingCourses()
      .filter((c) => c.publishDate)
      .map((c) => ({
        date: c.publishDate!,
        label: `Yayına girecek eğitim (${timeLabel(c.publishDate!)}): ${c.title}`,
        kind: 'publish' as const,
      })),
  ]);
}
