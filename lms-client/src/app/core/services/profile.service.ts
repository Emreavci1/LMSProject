import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../api.config';
import { UploadResult } from './upload.service';

// Kullanıcının kendi profili (avatar) — tüm roller
@Injectable({ providedIn: 'root' })
export class ProfileService {
  private http = inject(HttpClient);
  private base = `${API_URL}/profile`;

  // Profil fotoğrafı yükle (dosya doğrulama backend'de: yalnızca resim, 5MB)
  uploadAvatar(file: File): Observable<UploadResult> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<UploadResult>(`${this.base}/avatar`, form);
  }

  // Hazır avatar seç ("preset:male|female|neutral") veya fotoğrafı kaldır (null)
  setAvatar(avatarUrl: string | null): Observable<void> {
    return this.http.put<void>(`${this.base}/avatar`, { avatarUrl });
  }
}
