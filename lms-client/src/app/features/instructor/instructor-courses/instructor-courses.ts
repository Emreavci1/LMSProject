import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { RouterLink } from '@angular/router';
import { Course } from '../../../core/models/course.models';
import { CourseService } from '../../../core/services/course.service';
import { MockDataService } from '../../../core/services/mock-data.service';
import { NotificationService } from '../../../core/services/notification.service';
import { coverCss } from '../../../core/utils/cover.util';

// Eğitmen: Eğitimlerim — kendi kurslarını gerçek API'den listeler/yönetir
@Component({
  selector: 'app-instructor-courses',
  imports: [
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    DatePipe,
  ],
  templateUrl: './instructor-courses.html',
  styleUrl: './instructor-courses.scss',
})
export class InstructorCourses {
  private courseService = inject(CourseService);
  private mock = inject(MockDataService);
  private notification = inject(NotificationService);

  readonly courses = signal<Course[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);

  // Şablonda kullanılan kapak yardımcı fonksiyonu
  protected readonly coverCss = coverCss;

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.courseService.getMyCourses().subscribe({
      next: (list) => {
        this.courses.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  // Taslak/zamanlanmış bir kursu yayına al (status = Published)
  publish(course: Course): void {
    this.courseService
      .update(course.id, {
        title: course.title,
        description: course.description,
        coverImageUrl: course.coverImageUrl,
        category: course.category,
        level: course.level,
        durationHours: course.durationHours,
        lessonCount: course.lessonCount,
        status: 'Published',
        publishDate: null,
      })
      .subscribe({
        next: (updated) => {
          this.courses.update((list) => list.map((c) => (c.id === updated.id ? updated : c)));
          this.notification.success(`"${course.title}" yayınlandı.`);
        },
        error: () => this.notification.error('Yayınlama başarısız oldu.'),
      });
  }

  // Aktif/Pasif durumunu değiştir (öğrencilere görünürlük)
  toggleActive(course: Course): void {
    const next = !course.isActive;
    this.courseService
      .update(course.id, {
        title: course.title,
        description: course.description,
        coverImageUrl: course.coverImageUrl,
        category: course.category,
        level: course.level,
        durationHours: course.durationHours,
        lessonCount: course.lessonCount,
        status: course.status,
        publishDate: course.publishDate ?? null,
        isActive: next,
      })
      .subscribe({
        next: (updated) => {
          this.courses.update((list) => list.map((c) => (c.id === updated.id ? updated : c)));
          this.notification.success(next ? 'Eğitim aktifleştirildi.' : 'Eğitim pasifleştirildi.');
        },
        error: () => this.notification.error('Durum güncellenemedi.'),
      });
  }

  // Kursu pasifleştir (soft delete)
  remove(course: Course): void {
    if (!confirm(`"${course.title}" eğitimini kalıcı olarak silmek istediğine emin misin?`)) return;
    this.courseService.remove(course.id).subscribe({
      next: () => {
        this.courses.update((list) => list.filter((c) => c.id !== course.id));
        this.mock.removeManagedLessonsOf(course.id); // yerel derslerini de temizle
        this.notification.success(`"${course.title}" silindi.`);
      },
      error: () => this.notification.error('Silme işlemi başarısız oldu.'),
    });
  }
}
