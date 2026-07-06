import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Course } from '../../../core/models/course.models';
import { AuthService } from '../../../core/services/auth.service';
import { CourseService } from '../../../core/services/course.service';
import { EnrollmentService } from '../../../core/services/enrollment.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-course-list',
  imports: [
    RouterLink,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './course-list.html',
  styleUrl: './course-list.scss',
})
export class CourseList {
  private courseService = inject(CourseService);
  private enrollmentService = inject(EnrollmentService);
  private notification = inject(NotificationService);
  protected auth = inject(AuthService);

  readonly loading = signal(true);
  readonly courses = signal<Course[]>([]);
  readonly searchTerm = signal('');

  // Katılımcının kayıtlı olduğu kurs id'leri — "Katıldın" rozetini göstermek için
  readonly enrolledCourseIds = signal<Set<number>>(new Set());

  // Arama kutusuna göre filtrelenmiş liste
  readonly filteredCourses = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.courses();
    return this.courses().filter(
      (c) =>
        c.title.toLowerCase().includes(term) ||
        c.instructorName.toLowerCase().includes(term)
    );
  });

  constructor() {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    const isAttendee = this.auth.role() === 'CourseAttendee';

    // Katılımcıysa kurslarla birlikte kendi katılımlarını da çek
    if (isAttendee) {
      forkJoin({
        courses: this.courseService.getAll(),
        enrollments: this.enrollmentService.getMyEnrollments(),
      }).subscribe({
        next: ({ courses, enrollments }) => {
          this.courses.set(courses);
          this.enrolledCourseIds.set(new Set(enrollments.map((e) => e.courseId)));
          this.loading.set(false);
        },
        error: (err) => {
          this.notification.fromHttpError(err, 'Kurslar yüklenemedi.');
          this.loading.set(false);
        },
      });
    } else {
      this.courseService.getAll().subscribe({
        next: (courses) => {
          this.courses.set(courses);
          this.loading.set(false);
        },
        error: (err) => {
          this.notification.fromHttpError(err, 'Kurslar yüklenemedi.');
          this.loading.set(false);
        },
      });
    }
  }

  isEnrolled(courseId: number): boolean {
    return this.enrolledCourseIds().has(courseId);
  }
}
