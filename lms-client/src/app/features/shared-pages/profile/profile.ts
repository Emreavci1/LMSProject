import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ProfileService } from '../../../core/services/profile.service';
import { avatarSrc } from '../../../core/utils/avatar.util';
import { ImageCropperDialog } from '../../../shared/components/image-cropper-dialog/image-cropper-dialog';

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
  private profileService = inject(ProfileService);

  protected readonly avatarSrc = avatarSrc;
  readonly uploadingAvatar = signal(false);

  // Hazır avatar seçenekleri (foto istemeyenler için)
  readonly presets = [
    { id: 'preset:male', label: 'Erkek' },
    { id: 'preset:female', label: 'Kadın' },
    { id: 'preset:neutral', label: 'Silüet' },
  ];

  private dialog = inject(MatDialog);

  // Fotoğraf seçilince Instagram tarzı yuvarlak çerçeveli kırpıcı açılır;
  // kırpılan kare görsel yüklenir ve profile atanır
  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const ref = this.dialog.open(ImageCropperDialog, {
      width: '480px',
      data: { imageChangedEvent: event, aspectRatio: 1, roundCropper: true },
    });

    ref.afterClosed().subscribe((croppedDataUrl: string | undefined) => {
      input.value = '';
      if (!croppedDataUrl) return; // iptal edildi

      this.uploadingAvatar.set(true);
      this.profileService.uploadAvatar(this.dataUrlToFile(croppedDataUrl, 'avatar.png')).subscribe({
        next: (result) => {
          this.auth.updateAvatar(result.url); // sidebar dahil her yer anında güncellenir
          this.uploadingAvatar.set(false);
          this.notification.success('Profil fotoğrafı güncellendi.');
        },
        error: (err) => {
          this.uploadingAvatar.set(false);
          this.notification.fromHttpError(err, 'Fotoğraf yüklenemedi.');
        },
      });
    });
  }

  // Kırpıcıdan dönen dataURL'i (base64) upload API'sine gönderilecek File'a çevirir
  private dataUrlToFile(dataUrl: string, name: string): File {
    const [head, b64] = dataUrl.split(',');
    const mime = head.match(/data:(.*?);/)?.[1] ?? 'image/png';
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new File([bytes], name, { type: mime });
  }

  // Hazır avatar seç
  selectPreset(presetId: string): void {
    this.profileService.setAvatar(presetId).subscribe({
      next: () => {
        this.auth.updateAvatar(presetId);
        this.notification.success('Avatar güncellendi.');
      },
      error: (err) => this.notification.fromHttpError(err, 'Avatar güncellenemedi.'),
    });
  }

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
