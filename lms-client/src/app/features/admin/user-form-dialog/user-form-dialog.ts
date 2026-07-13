import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { UserRole } from '../../../core/models/auth.models';
import { CreateUser, UpdateUser, User } from '../../../core/models/user.models';
import { NotificationService } from '../../../core/services/notification.service';
import { UserService } from '../../../core/services/user.service';

// Dialog'a dışarıdan gelen veri: düzenlenecek kullanıcı (yoksa yeni kayıt)
export interface UserFormData {
  user?: User;
}

@Component({
  selector: 'app-user-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './user-form-dialog.html',
  styleUrl: './user-form-dialog.scss',
})
export class UserFormDialog {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private notification = inject(NotificationService);
  private dialogRef = inject(MatDialogRef<UserFormDialog>);
  protected data = inject<UserFormData>(MAT_DIALOG_DATA);

  readonly isEditMode = !!this.data.user;
  readonly saving = signal(false);
  readonly hidePassword = signal(true);

  readonly roles: UserRole[] = ['CourseAttendee', 'Instructor', 'Admin'];
  readonly roleLabels: Record<UserRole, string> = {
    CourseAttendee: 'Katılımcı',
    Instructor: 'Eğitmen',
    Admin: 'Yönetici',
  };

  readonly form = this.fb.nonNullable.group({
    fullName: [this.data.user?.fullName ?? '', [Validators.required, Validators.maxLength(150)]],
    email: [this.data.user?.email ?? '', [Validators.required, Validators.email]],
    // Yeni kayıtta şifre zorunlu; düzenlemede boş bırakılırsa değişmez
    password: [
      '',
      this.data.user ? [Validators.minLength(8)] : [Validators.required, Validators.minLength(8)],
    ],
    role: [this.data.user?.role ?? ('CourseAttendee' as UserRole), [Validators.required]],
    isActive: [this.data.user?.isActive ?? true],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const value = this.form.getRawValue();

    if (this.data.user) {
      const payload: UpdateUser = {
        fullName: value.fullName,
        email: value.email,
        role: value.role,
        // Mevcut avatar korunur (gönderilmezse backend null'a çeker)
        avatarUrl: this.data.user.avatarUrl ?? null,
        isActive: value.isActive,
        // Şifre yalnızca doldurulduysa gönderilir
        ...(value.password ? { password: value.password } : {}),
      };
      this.userService.update(this.data.user.id, payload).subscribe({
        next: () => this.done('Kullanıcı güncellendi.'),
        error: (err) => this.fail(err),
      });
    } else {
      const payload: CreateUser = {
        fullName: value.fullName,
        email: value.email,
        password: value.password,
        role: value.role,
      };
      this.userService.create(payload).subscribe({
        next: () => this.done('Kullanıcı oluşturuldu.'),
        error: (err) => this.fail(err),
      });
    }
  }

  private done(message: string): void {
    this.saving.set(false);
    this.notification.success(message);
    this.dialogRef.close(true); // true = liste yenilensin
  }

  private fail(err: unknown): void {
    this.saving.set(false);
    this.notification.fromHttpError(err, 'İşlem başarısız.');
  }
}
