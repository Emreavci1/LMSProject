import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { Course } from '../../../core/models/course.models';
import { UserEnrollment } from '../../../core/models/enrollment.models';
import { User } from '../../../core/models/user.models';
import { UserService } from '../../../core/services/user.service';
import { avatarSrc } from '../../../core/utils/avatar.util';

// Admin: Kullanıcı Detayı — kimlik bilgileri + role göre eğitim geçmişi.
// Katılımcı: katıldığı eğitimler ve ilerlemeleri (zorunlu/gecikme durumuyla).
// Eğitmen/Admin: açtığı eğitimler ve katılımcı sayıları.
@Component({
  selector: 'app-user-detail',
  imports: [
    DatePipe,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './user-detail.html',
  styleUrl: './user-detail.scss',
})
export class UserDetail {
  readonly id = input.required<string>();

  private userService = inject(UserService);

  protected readonly avatarSrc = avatarSrc;
  readonly loading = signal(true);
  readonly user = signal<User | null>(null);
  readonly enrollments = signal<UserEnrollment[]>([]);
  readonly courses = signal<Course[]>([]);

  readonly roleLabels: Record<string, string> = {
    CourseAttendee: 'Katılımcı',
    Instructor: 'Eğitmen',
    Admin: 'Yönetici',
  };

  // id değişince kullanıcıyı ve role uygun listeleri yükle
  private readonly _load = effect(() => {
    const userId = Number(this.id());
    this.loading.set(true);

    // Tek kullanıcı ucu yok; admin listesinden bulunur (liste zaten küçük)
    this.userService.getAll().subscribe({
      next: (users) => {
        const found = users.find((u) => u.id === userId) ?? null;
        this.user.set(found);
        if (!found) {
          this.loading.set(false);
          return;
        }

        if (found.role === 'CourseAttendee') {
          this.userService.getEnrollments(userId).subscribe({
            next: (list) => {
              this.enrollments.set(list);
              this.loading.set(false);
            },
            error: () => this.loading.set(false),
          });
        } else {
          this.userService.getCourses(userId).subscribe({
            next: (list) => {
              this.courses.set(list);
              this.loading.set(false);
            },
            error: () => this.loading.set(false),
          });
        }
      },
      error: () => this.loading.set(false),
    });
  });

  // Avatar baş harfleri
  readonly initials = computed(() => {
    const name = this.user()?.fullName ?? '';
    return name
      .split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  });

  // --- Katılımcı istatistikleri ---
  readonly completedCount = computed(
    () => this.enrollments().filter((e) => e.progress === 100).length
  );
  readonly overdueCount = computed(
    () => this.enrollments().filter((e) => e.isOverdue).length
  );

  // --- Eğitmen istatistikleri ---
  readonly totalStudents = computed(() =>
    this.courses().reduce((sum, c) => sum + c.studentCount, 0)
  );
}
