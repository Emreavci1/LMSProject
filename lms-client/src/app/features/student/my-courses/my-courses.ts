import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { forkJoin, map, of, switchMap } from 'rxjs';
import { CourseService } from '../../../core/services/course.service';
import { EnrollmentService } from '../../../core/services/enrollment.service';
import { LessonService } from '../../../core/services/lesson.service';
import { ProgressService } from '../../../core/services/progress.service';
import { coverCss } from '../../../core/utils/cover.util';
import { formatDuration } from '../../../core/utils/duration.util';

// Kayıtlı kurs kartı
interface EnrolledCard {
  id: number;
  title: string;
  category: string;
  durationMinutes: number; // göstermelik toplam süre (30 dk yuvarlı)
  cover: string; // CSS background değeri
  // İlerleme ve tamamlanan dakika hesabı için (dakika = GERÇEK süre)
  lessons: { id: number; durationMin: number }[];
  playerLink: string[]; // /learn/:id
}

// Öğrenci: Eğitimlerim — kayıtlı kursların listesi, ilerleme ve öğrenme süresi.
// İlerleme = tamamlanan ders / toplam ders. Öğrenme süresi = tamamlanan derslerin
// GERÇEK dakika toplamı (kurs süresi ise göstermelik/yuvarlı).
@Component({
  selector: 'app-my-courses',
  imports: [MatIconModule, MatButtonModule, RouterLink],
  templateUrl: './my-courses.html',
  styleUrl: './my-courses.scss',
})
export class MyCourses {
  private progressService = inject(ProgressService);
  private courseService = inject(CourseService);
  private enrollmentService = inject(EnrollmentService);
  private lessonService = inject(LessonService);

  // Katılımlar (kurs + ders bilgileriyle birleşmiş)
  readonly allCards = signal<EnrolledCard[]>([]);

  constructor() {
    // Tamamlanan dersler backend'den (ilerleme hesabı için)
    this.progressService.load();

    // Katılımlarım + yayındaki kurslar çekilir; ardından her kursun dersleri alınır
    // (ilerleme ve öğrenme süresi ders bazında hesaplanır).
    forkJoin({
      enrollments: this.enrollmentService.getMyEnrollments(),
      courses: this.courseService.getAll(),
    })
      .pipe(
        switchMap(({ enrollments, courses }) => {
          if (enrollments.length === 0) return of<EnrolledCard[]>([]);
          return forkJoin(
            enrollments.map((e) => {
              const course = courses.find((c) => c.id === e.courseId);
              return this.lessonService.getByCourse(e.courseId).pipe(
                map(
                  (lessons): EnrolledCard => ({
                    id: e.courseId,
                    title: course?.title ?? e.courseTitle,
                    category: course?.category || 'Genel',
                    durationMinutes: course?.durationMinutes ?? 0,
                    cover: coverCss(course?.coverImageUrl),
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

  // İlerleme her render'da canlı hesaplanır (ders tamamlama anında yansısın)
  progressOf(card: EnrolledCard): number {
    if (card.lessons.length === 0) return 0;
    const done = card.lessons.filter((l) =>
      this.progressService.completedLessonIds().has(l.id)
    ).length;
    return Math.round((done / card.lessons.length) * 100);
  }

  // Bu kartta tamamlanan derslerin GERÇEK dakika toplamı
  private completedMinutes(card: EnrolledCard): number {
    return card.lessons
      .filter((l) => this.progressService.completedLessonIds().has(l.id))
      .reduce((sum, l) => sum + (l.durationMin || 0), 0);
  }

  readonly completedCount = computed(
    () => this.allCards().filter((c) => this.progressOf(c) === 100).length
  );

  // Toplam öğrenme süresi = tüm kartlarda tamamlanan derslerin gerçek dakika toplamı.
  // Ana sayfadaki "Öğrenme Süresi" ile aynı mantık (dummy değil).
  readonly totalLearningMinutes = computed(() =>
    this.allCards().reduce((sum, c) => sum + this.completedMinutes(c), 0)
  );
  readonly learningLabel = computed(() => formatDuration(this.totalLearningMinutes()));
}
