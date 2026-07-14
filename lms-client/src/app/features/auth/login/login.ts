import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Ekran durumları
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly hidePassword = signal(true);

  // Form: anlık (client-side) validasyon kuralları
  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  submit(): void {
    // Geçersiz formu gönderme; hataları görünür yap
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.doLogin(this.form.getRawValue());
  }

  // --- GELİŞTİRME KOLAYLIĞI: hızlı rol girişi ---
  // Seed edilmiş test kullanıcıları. Sisteme çıkarken (production) bu blok kaldırılmalı.
  readonly quickLoginUsers = [
    { label: 'Admin', email: 'admin@losev.org.tr', password: 'Admin123!', icon: 'shield_person' },
    { label: 'Eğitmen', email: 'egitmen1@losev.org.tr', password: 'Egitmen123!', icon: 'school' },
    { label: 'Katılımcı 1', email: 'katilimci1@losev.org.tr', password: 'Katilimci123!', icon: 'person' },
    { label: 'Katılımcı 2', email: 'katilimci2@losev.org.tr', password: 'Katilimci123!', icon: 'person' },
    { label: 'Katılımcı 3', email: 'katilimci3@losev.org.tr', password: 'Katilimci123!', icon: 'person' },
  ];

  quickLogin(email: string, password: string): void {
    // Formu da doldur ki kullanıcı hangi hesapla girdiğini görsün
    this.form.setValue({ email, password });
    this.doLogin({ email, password });
  }

  // Ortak giriş mantığı (form gönderimi ve hızlı giriş bunu kullanır)
  private doLogin(credentials: { email: string; password: string }): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService.login(credentials).subscribe({
      next: () => this.router.navigate(['/']),
      error: (err) => {
        this.loading.set(false);
        // 401 → backend'in genel mesajı; diğer hatalar → bağlantı sorunu
        this.errorMessage.set(
          err.status === 401
            ? 'Email veya şifre hatalı.'
            : 'Sunucuya ulaşılamadı. Lütfen tekrar deneyin.'
        );
      },
    });
  }
}
