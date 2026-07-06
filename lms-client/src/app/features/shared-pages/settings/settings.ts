import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { NotificationService } from '../../../core/services/notification.service';

// Ayarlar — bildirim tercihleri + şifre değiştirme (şimdilik mock)
@Component({
  selector: 'app-settings',
  imports: [
    ReactiveFormsModule,
    MatSlideToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class Settings {
  private fb = inject(FormBuilder);
  private notification = inject(NotificationService);

  // Bildirim tercihleri (mock durum)
  readonly emailNotifications = signal(true);
  readonly courseReminders = signal(true);
  readonly announcementEmails = signal(false);

  readonly passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
  });

  changePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    const { newPassword, confirmPassword } = this.passwordForm.getRawValue();
    if (newPassword !== confirmPassword) {
      this.notification.error('Yeni şifreler birbiriyle uyuşmuyor.');
      return;
    }
    // TODO: backend şifre değiştirme endpoint'i eklenince bağlanacak
    this.notification.success('Şifre değiştirildi. (şimdilik simülasyon)');
    this.passwordForm.reset();
  }
}
