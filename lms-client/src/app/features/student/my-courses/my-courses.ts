import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { CourseService } from '../../../core/services/course.service';
import { EnrollmentService } from '../../../core/services/enrollment.service';
import { MockDataService } from '../../../core/services/mock-data.service';
import { coverCss } from '../../../core/utils/cover.util';

// Kayıtlı kurs kartı: gerçek (API) ve demo (mock) kayıtları tek tipte birleştirir
interface EnrolledCard {
  key: string; // 'real-5' | 'demo-1' — id çakışmasını önler
  id: number;
  isReal: boolean;
  title: string;
  category: string;
  durationHours: number;
  cover: string; // CSS background değeri
  progress: number; // 0-100
  playerLink: string[]; // gerçek: /learn/:id, demo: /learn/demo/:id
}

// Öğrenci: Eğitimlerim — kayıtlı olunan kursların listesi ve ilerleme durumu.
// Gerçek katılımlar backend'den gelir, yanlarında demo kayıtlar gösterilir.
@Component({
  selector: 'app-my-courses',
  imports: [MatIconModule, MatButtonModule, RouterLink],
  templateUrl: './my-courses.html',
  styleUrl: './my-courses.scss',
})
export class MyCourses {
  protected mock = inject(MockDataService);
  private courseService = inject(CourseService);
  private enrollmentService = inject(EnrollmentService);

  // Gerçek katılımlar (kurs bilgileriyle birleşmiş)
  private readonly realCards = signal<EnrolledCard[]>([]);

  constructor() {
    // Katılımlarım + yayındaki kurslar birlikte çekilir, courseId ile eşlenir.
    // (Enrollment DTO'sunda kapak/kategori yok; kurs kataloğundan tamamlanır)
    forkJoin({
      enrollments: this.enrollmentService.getMyEnrollments(),
      courses: this.courseService.getAll(),
    }).subscribe({
      next: ({ enrollments, courses }) => {
        this.realCards.set(
          enrollments.map((e) => {
            const course = courses.find((c) => c.id === e.courseId);
            return {
              key: `real-${e.courseId}`,
              id: e.courseId,
              isReal: true,
              title: course?.title ?? e.courseTitle,
              category: course?.category || 'Genel',
              durationHours: course?.durationHours ?? 0,
              cover: coverCss(course?.coverImageUrl),
              progress: 0, // ilerleme signal'den canlı okunur (template'te)
              playerLink: ['/learn', String(e.courseId)],
            };
          })
        );
      },
      error: () => { /* demo kartlar yine de gösterilir */ },
    });
  }

  // Demo kayıtları aynı kart tipine çevir
  private readonly demoCards = computed<EnrolledCard[]>(() =>
    this.mock.enrolledCourses().map((c) => ({
      key: `demo-${c.id}`,
      id: c.id,
      isReal: false,
      title: c.title,
      category: c.category,
      durationHours: c.durationHours,
      cover: c.cover,
      progress: 0,
      playerLink: ['/learn', 'demo', String(c.id)],
    }))
  );

  // Gerçek kayıtlar önce, demo kayıtlar sonra
  readonly allCards = computed<EnrolledCard[]>(() => [
    ...this.realCards(),
    ...this.demoCards(),
  ]);

  // İlerleme her render'da canlı hesaplanır (ders tamamlama anında yansısın)
  progressOf(card: EnrolledCard): number {
    return card.isReal
      ? this.mock.managedProgressOf(card.id)
      : this.mock.progressOf(card.id);
  }

  readonly completedCount = computed(
    () => this.allCards().filter((c) => this.progressOf(c) === 100).length
  );

  readonly totalHours = computed(() =>
    this.allCards().reduce((sum, c) => sum + c.durationHours, 0)
  );
}
