import { Component, computed, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { forkJoin, map, of, switchMap } from 'rxjs';
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
  // İlerleme + öğrenme süresi hesabı için (dakika = GERÇEK süre)
  lessons: { id: number; durationMin: number }[];
  playerLink: string[];
}

// Varsayılan kapak (gerçek kursta kapak yoksa)
const DEFAULT_COVER = 'linear-gradient(135deg, #0284C7, #0F172A)';

// Role göre farklı içerik gösteren ana sayfa (dashboard).
// Öğrenci için gerçek istatistikleri (katılınan/tamamlanan kurs, öğrenme süresi) hesaplar.
@Component({
  selector: 'app-dashboard',
  imports: [MatCardModule, MatIconModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  protected readonly auth = inject(AuthService);
  private progressService = inject(ProgressService);
  private courseService = inject(CourseService);
  private enrollmentService = inject(EnrollmentService);
  private lessonService = inject(LessonService);

  // Katılımlar (API'den) — yalnızca öğrenci için çekilir
  readonly allCards = signal<DashboardCard[]>([]);

  // Eğitmenin açtığı kurslar (API'den) — yalnızca eğitmen için çekilir
  readonly myCourses = signal<Course[]>([]);

  constructor() {
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
                      lessons: lessons.map((l) => ({ id: l.id, durationMin: l.durationMin })),
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

  // İlerleme her render'da canlı hesaplanır (ders tamamlama anında yansısın)
  progressOf(card: DashboardCard): number {
    if (card.lessons.length === 0) return 0;
    const done = card.lessons.filter((l) =>
      this.progressService.completedLessonIds().has(l.id)
    ).length;
    return Math.round((done / card.lessons.length) * 100);
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

  // Toplam açılan ders sayısı
  readonly totalLessons = computed(() =>
    this.myCourses().reduce((sum, c) => sum + c.lessonCount, 0)
  );

  // Toplam içerik süresi (takribi saat gösterimi — kurs süresi kuralıyla aynı)
  readonly totalContentLabel = computed(() =>
    formatCourseHours(this.myCourses().reduce((sum, c) => sum + c.durationMinutes, 0))
  );

  // Eğitmen kartlarında kapak CSS'i
  courseCover(course: Course): string {
    return coverCss(course.coverImageUrl);
  }
}
