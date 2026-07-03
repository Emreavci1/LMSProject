import { Component, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';
import { Course } from '../../../core/models/course.models';
import { CourseAttendee } from '../../../core/models/enrollment.models';
import { AuthService } from '../../../core/services/auth.service';
import { CourseService } from '../../../core/services/course.service';
import { EnrollmentService } from '../../../core/services/enrollment.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-course-detail',
  imports: [
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatDividerModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './course-detail.html',
  styleUrl: './course-detail.scss',
})
export class CourseDetail {
  // Route parametresi (withComponentInputBinding sayesinde otomatik bağlanır)
  readonly id = input.required<string>();

  private courseService = inject(CourseService);
  private enrollmentService = inject(EnrollmentService);
  private notification = inject(NotificationService);
  private router = inject(Router);
  protected auth = inject(AuthService);

  readonly loading = signal(true);
  readonly course = signal<Course | null>(null);
  readonly isEnrolled = signal(false);
  readonly enrolling = signal(false);

  // Sahibi/admin için katılımcı listesi
  readonly attendees = signal<CourseAttendee[]>([]);

  // Bu kullanıcı kursu düzenleyebilir mi? (sahibi Instructor veya Admin)
  // Not: UI ipucu; gerçek yetki kontrolü backend'de yapılır.
  readonly canManage = computed(() => {
    const c = this.course();
    if (!c) return false;
    return (
      this.auth.role() === 'Admin' ||
      (this.auth.role() === 'Instructor' &&
        c.instructorId === this.auth.currentUser()?.userId)
    );
  });

  readonly isAttendee = computed(() => this.auth.role() === 'CourseAttendee');

  constructor() {
    this.load();
  }

  private load(): void {
    const courseId = Number(this.id());
    this.loading.set(true);

    this.courseService.getById(courseId).subscribe({
      next: (course) => {
        this.course.set(course);
        this.loading.set(false);
        this.loadRoleSpecificData(courseId);
      },
      error: (err) => {
        this.loading.set(false);
        this.notification.fromHttpError(err, 'Kurs bulunamadı.');
        this.router.navigate(['/courses']);
      },
    });
  }

  private loadRoleSpecificData(courseId: number): void {
    // Katılımcı: bu kursa kayıtlı mı kontrol et
    if (this.isAttendee()) {
      this.enrollmentService.getMyEnrollments().subscribe({
        next: (enrollments) =>
          this.isEnrolled.set(enrollments.some((e) => e.courseId === courseId)),
      });
    }

    // Instructor/Admin: katılımcı listesini çek.
    // Sahibi değilse backend 403 döner; o durumda listeyi sessizce boş bırakırız.
    if (this.auth.role() === 'Instructor' || this.auth.role() === 'Admin') {
      this.courseService.getAttendees(courseId).subscribe({
        next: (attendees) => this.attendees.set(attendees),
        error: () => this.attendees.set([]),
      });
    }
  }

  enroll(): void {
    const c = this.course();
    if (!c) return;

    this.enrolling.set(true);
    this.enrollmentService.enroll(c.id).subscribe({
      next: () => {
        this.isEnrolled.set(true);
        this.enrolling.set(false);
        this.notification.success('Kursa başarıyla katıldınız.');
      },
      error: (err) => {
        this.enrolling.set(false);
        this.notification.fromHttpError(err, 'Kursa katılınamadı.');
      },
    });
  }
}
