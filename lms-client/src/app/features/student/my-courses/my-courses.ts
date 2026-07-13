import { DatePipe } from '@angular/common';
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
  // Kurum eğitimi (Admin açtı) — kartta öne çıkan rozetle gösterilir
  isOfficial: boolean;
  // Zorunlu eğitim ataması: son tamamlama tarihi kartta gösterilir
  isAssigned: boolean;
  dueDate?: string | null;
  // İlerleme (yük ağırlıklı) ve tamamlanan dakika hesabı için
  lessons: { id: number; durationMin: number; weight: number }[];
  playerLink: string[]; // /learn/:id
}

// Öğrenci: Eğitimlerim — kayıtlı kursların listesi, ilerleme ve öğrenme süresi.
// İlerleme = tamamlanan ders / toplam ders. Öğrenme süresi = tamamlanan derslerin
// GERÇEK dakika toplamı (kurs süresi ise göstermelik/yuvarlı).
@Component({
  selector: 'app-my-courses',
  imports: [DatePipe, MatIconModule, MatButtonModule, RouterLink],
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

  // Filtre sekmeleri: Tümü / Devam Edenler / Tamamlananlar
  readonly filter = signal<'all' | 'active' | 'done'>('all');

  readonly filteredCards = computed(() => {
    const filter = this.filter();
    if (filter === 'all') return this.allCards();
    return this.allCards().filter((c) =>
      filter === 'done' ? this.progressOf(c) === 100 : this.progressOf(c) < 100
    );
  });

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
                    isOfficial: course?.isOfficial ?? false,
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

  // Zorunlu eğitimde son tarih (saatli, kesin an) geçti ve eğitim hâlâ bitmedi mi?
  isOverdue(card: EnrolledCard): boolean {
    if (!card.dueDate || this.progressOf(card) === 100) return false;
    return new Date(card.dueDate).getTime() < Date.now();
  }

  // İlerleme: ders yükü (kredi) ağırlıklı — her render'da canlı hesaplanır
  progressOf(card: EnrolledCard): number {
    const totalWeight = card.lessons.reduce((sum, l) => sum + l.weight, 0);
    if (totalWeight === 0) return 0;
    const doneWeight = card.lessons
      .filter((l) => this.progressService.completedLessonIds().has(l.id))
      .reduce((sum, l) => sum + l.weight, 0);
    return Math.round((doneWeight / totalWeight) * 100);
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
