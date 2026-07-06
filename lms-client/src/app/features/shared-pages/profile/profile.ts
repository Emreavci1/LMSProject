import { Component, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

// Profil sayfası — tüm roller kullanır.
// Not: Kaydetme şimdilik mock; profil güncelleme endpoint'i backend'e eklenecek.
@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile {
  protected auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private notification = inject(NotificationService);

  readonly initials = computed(() => {
    const name = this.auth.currentUser()?.fullName ?? '';
    return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  });

  readonly form = this.fb.nonNullable.group({
    fullName: [this.auth.currentUser()?.fullName ?? '', [Validators.required]],
    email: [this.auth.currentUser()?.email ?? '', [Validators.required, Validators.email]],
    phone: [''],
    bio: [''],
  });

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    // TODO: backend profil güncelleme endpoint'i eklenince bağlanacak
    this.notification.success('Profil bilgileri kaydedildi. (şimdilik simülasyon)');
  }
}
