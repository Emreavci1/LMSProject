import { Component, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';
import { CourseService } from '../../../core/services/course.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-course-form',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './course-form.html',
  styleUrl: './course-form.scss',
})
export class CourseForm {
  // Route'ta id varsa düzenleme, yoksa yeni kurs modu
  readonly id = input<string>();

  private fb = inject(FormBuilder);
  private courseService = inject(CourseService);
  private notification = inject(NotificationService);
  private router = inject(Router);

  readonly isEditMode = computed(() => !!this.id());
  readonly loading = signal(false);
  readonly saving = signal(false);

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    description: ['', [Validators.required, Validators.maxLength(2000)]],
  });

  constructor() {
    // Düzenleme modundaysa mevcut kurs verisini yükle
    const courseId = this.id();
    if (courseId) {
      this.loadCourse(Number(courseId));
    }
  }

  private loadCourse(courseId: number): void {
    this.loading.set(true);
    this.courseService.getById(courseId).subscribe({
      next: (course) => {
        this.form.patchValue({ title: course.title, description: course.description });
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.notification.fromHttpError(err, 'Kurs yüklenemedi.');
        this.router.navigate(['/courses']);
      },
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const value = this.form.getRawValue();
    const courseId = this.id();

    const request$ = courseId
      ? this.courseService.update(Number(courseId), value)
      : this.courseService.create(value);

    request$.subscribe({
      next: (course) => {
        this.saving.set(false);
        this.notification.success(
          this.isEditMode() ? 'Kurs güncellendi.' : 'Kurs oluşturuldu.'
        );
        this.router.navigate(['/courses', course.id]);
      },
      error: (err) => {
        this.saving.set(false);
        this.notification.fromHttpError(err, 'Kurs kaydedilemedi.');
      },
    });
  }
}
