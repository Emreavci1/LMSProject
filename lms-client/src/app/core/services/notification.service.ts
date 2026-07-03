import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

// Kullanıcıya kısa bildirimler (toast/snackbar) gösterir.
// API hataları ve başarılı işlemler bununla bildirilir.
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private snackBar = inject(MatSnackBar);

  success(message: string): void {
    this.snackBar.open(message, 'Tamam', {
      duration: 3000,
      panelClass: 'snackbar-success',
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }

  error(message: string): void {
    this.snackBar.open(message, 'Kapat', {
      duration: 5000,
      panelClass: 'snackbar-error',
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }

  // HTTP hatasından kullanıcı dostu mesaj çıkarır.
  // Backend { message: "..." } formatında hata döner (ServiceResult).
  fromHttpError(err: unknown, fallback = 'Bir hata oluştu.'): void {
    const httpErr = err as { error?: { message?: string }; status?: number };
    const message =
      httpErr?.error?.message ??
      (httpErr?.status === 0 ? 'Sunucuya ulaşılamadı.' : fallback);
    this.error(message);
  }
}
