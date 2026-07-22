import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { API_URL } from '../api.config';
import { NotificationService } from './notification.service';

// Toggle cevabı (backend LessonCompletionStateDto karşılığı)
export interface LessonCompletionState {
  lessonId: number;
  completed: boolean;
}

// Ders tamamlama (ilerleme) durumu — backend'de LessonCompletions tablosunda tutulur.
// Tüm sayfalar (player, eğitimlerim, dashboard) bu signal'den okur; böylece bir
// sayfada işaretlenen ders diğerlerine anında yansır.
@Injectable({ providedIn: 'root' })
export class ProgressService {
  private http = inject(HttpClient);
  private notification = inject(NotificationService);
  private base = `${API_URL}/progress`;

  // Kullanıcının tamamladığı derslerin id kümesi
  readonly completedLessonIds = signal<Set<number>>(new Set());

  // Kullanıcının gönderdiği (tamamlanmış sayılan) sınav id kümesi —
  // player ilerleme çubuğuna sınavları dahil etmek için
  readonly submittedExamIds = signal<Set<number>>(new Set());

  // Tamamlananları API'den (yeniden) yükle — sayfa açılışlarında çağrılır
  load(): void {
    this.http.get<number[]>(`${this.base}/my`).subscribe({
      next: (ids) => this.completedLessonIds.set(new Set(ids)),
      error: () => {
        /* liste boş kalır; sayfa yine de çalışır */
      },
    });
  }

  // Gönderilen sınav id'lerini yükle (ilerleme hesabı için)
  loadExams(): void {
    this.http.get<number[]>(`${this.base}/exams/my`).subscribe({
      next: (ids) => this.submittedExamIds.set(new Set(ids)),
      error: () => {
        /* boş kalır */
      },
    });
  }

  isExamSubmitted(examId: number): boolean {
    return this.submittedExamIds().has(examId);
  }

  // Dersi tamamla / işareti geri al. Optimistik: önce UI güncellenir,
  // API hatasında eski duruma dönülür.
  toggle(lessonId: number): void {
    const before = this.completedLessonIds();
    const next = new Set(before);
    if (next.has(lessonId)) next.delete(lessonId);
    else next.add(lessonId);
    this.completedLessonIds.set(next);

    this.http
      .post<LessonCompletionState>(`${this.base}/lessons/${lessonId}/toggle`, {})
      .subscribe({
        next: (state) => {
          // Sunucunun söylediği son durumla senkronla
          const set = new Set(this.completedLessonIds());
          if (state.completed) set.add(state.lessonId);
          else set.delete(state.lessonId);
          this.completedLessonIds.set(set);
        },
        error: (err) => {
          this.completedLessonIds.set(before);
          this.notification.fromHttpError(err, 'Ders durumu kaydedilemedi.');
        },
      });
  }

  isCompleted(lessonId: number): boolean {
    return this.completedLessonIds().has(lessonId);
  }
}
