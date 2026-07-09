import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { RouterLink } from '@angular/router';
import { Course, UpdateCourse } from '../../../core/models/course.models';
import { CourseService } from '../../../core/services/course.service';
import { NotificationService } from '../../../core/services/notification.service';
import { coverCss } from '../../../core/utils/cover.util';

// Admin: Eğitim Yönetimi — tüm kursları (pasif/taslak dahil) backend'den listeler,
// durum toggle ile aktif/pasif yapılır, "Detay" kurs yönetim sayfasına götürür.
@Component({
  selector: 'app-admin-course-list',
  imports: [FormsModule, RouterLink, MatIconModule, MatButtonModule, MatSlideToggleModule],
  templateUrl: './admin-course-list.html',
  styleUrl: './admin-course-list.scss',
})
export class AdminCourseList {
  private courseService = inject(CourseService);
  private notification = inject(NotificationService);

  protected readonly coverCss = coverCss;

  readonly courses = signal<Course[]>([]);
  readonly loading = signal(true);

  readonly searchTerm = signal('');
  readonly categoryFilter = signal<string | null>(null);
  readonly statusFilter = signal<'all' | 'active' | 'passive'>('all');

  constructor() {
    this.courseService.getAllForAdmin().subscribe({
      next: (list) => {
        this.courses.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.notification.fromHttpError(err, 'Eğitimler yüklenemedi.');
      },
    });
  }

  // Kategori filtresi seçenekleri: mevcut kurslardan benzersiz kategoriler
  readonly categories = computed(() => {
    const set = new Set<string>();
    for (const c of this.courses()) {
      if (c.category) set.add(c.category);
    }
    return [...set].sort();
  });

  readonly filteredCourses = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const category = this.categoryFilter();
    const status = this.statusFilter();

    return this.courses().filter((c) => {
      if (status === 'active' && !c.isActive) return false;
      if (status === 'passive' && c.isActive) return false;
      if (category && c.category !== category) return false;
      if (term && !c.title.toLowerCase().includes(term) && !c.instructorName.toLowerCase().includes(term)) return false;
      return true;
    });
  });

  // Aktif/Pasif değiştir: backend PUT tüm alanları istediği için mevcut değerlerle gönderilir
  toggleStatus(course: Course): void {
    const dto: UpdateCourse = {
      title: course.title,
      description: course.description,
      coverImageUrl: course.coverImageUrl,
      category: course.category,
      level: course.level,
      durationHours: course.durationHours,
      lessonCount: course.lessonCount,
      status: course.status,
      publishDate: course.publishDate,
      isActive: !course.isActive,
    };

    this.courseService.update(course.id, dto).subscribe({
      next: (updated) => {
        this.courses.update((list) => list.map((c) => (c.id === updated.id ? updated : c)));
        this.notification.success(
          updated.isActive ? 'Eğitim aktifleştirildi.' : 'Eğitim pasifleştirildi.'
        );
      },
      error: (err) => this.notification.fromHttpError(err, 'Eğitim durumu güncellenemedi.'),
    });
  }
}
