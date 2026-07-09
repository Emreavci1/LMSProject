import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../api.config';
import { LessonContentType } from '../models/lesson.models';

// POST /api/uploads cevabı (backend UploadResultDto karşılığı)
export interface UploadResult {
  url: string; // sunucudaki göreli yol, ders ContentUrl'üne yazılır (örn. /uploads/images/abc.jpg)
  fileName: string; // kullanıcının yüklediği orijinal ad (arayüzde göstermek için)
}

// Ders içerik dosyası yükleme (foto / sunum-PDF / video) — yalnızca eğitmen/admin.
// Dosya sunucuda wwwroot/uploads altına kaydedilir; DB'ye yalnızca yol gider.
@Injectable({ providedIn: 'root' })
export class UploadService {
  private http = inject(HttpClient);

  upload(file: File, contentType: LessonContentType): Observable<UploadResult> {
    // FormData ile multipart gönderilir; Content-Type başlığını tarayıcı kendisi
    // (boundary ile) koyar, elle set edilmez. JWT'yi interceptor ekler.
    const form = new FormData();
    form.append('file', file);
    form.append('contentType', contentType);
    return this.http.post<UploadResult>(`${API_URL}/uploads`, form);
  }
}
