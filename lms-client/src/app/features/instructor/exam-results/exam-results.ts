import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  EvaluateAttempt,
  ExamAttemptDetail,
  ExamAttemptListItem,
} from '../../../core/models/exam.models';
import { ExamService } from '../../../core/services/exam.service';
import { NotificationService } from '../../../core/services/notification.service';

// Eğitmen/admin: bir sınavın öğrenci denemelerini görüntüleme + değerlendirme.
// exam-editor "Sınavlar" sekmesinden bir sınavın "Sonuçlar"ı açılınca gösterilir.
@Component({
  selector: 'app-exam-results',
  imports: [DatePipe, MatIconModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './exam-results.html',
  styleUrl: './exam-results.scss',
})
export class ExamResults {
  readonly courseId = input.required<number>();
  readonly examId = input.required<number>();
  readonly examTitle = input<string>('');
  readonly close = output<void>();

  private examService = inject(ExamService);
  private notification = inject(NotificationService);

  readonly attempts = signal<ExamAttemptListItem[]>([]);
  readonly loading = signal(true);

  // Puanlama ekranı (bir deneme seçilince)
  readonly selected = signal<ExamAttemptDetail | null>(null);
  readonly loadingDetail = signal(false);
  readonly saving = signal(false);

  // Açık uçlu kredileri (soruId → 0-100) + geçti/kaldı
  readonly credits = signal<Map<number, number>>(new Map());
  readonly passed = signal(false);

  private readonly _load = effect(() => {
    this.examId(); // bağımlılık
    this.loadAttempts();
  });

  private loadAttempts(): void {
    this.loading.set(true);
    this.examService.getAttempts(this.courseId(), this.examId()).subscribe({
      next: (list) => {
        this.attempts.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.attempts.set([]);
        this.loading.set(false);
      },
    });
  }

  readonly view = computed<'list' | 'grade'>(() => (this.selected() ? 'grade' : 'list'));

  // --- Puanlama ekranını aç ---
  openDetail(attempt: ExamAttemptListItem): void {
    this.loadingDetail.set(true);
    this.selected.set({ attemptId: attempt.attemptId } as ExamAttemptDetail); // view'ı grade'e geçir
    this.examService.getAttemptDetail(this.courseId(), this.examId(), attempt.attemptId).subscribe({
      next: (detail) => {
        this.selected.set(detail);
        // Kredileri mevcut değerlerle (yoksa 0) başlat
        const map = new Map<number, number>();
        for (const a of detail.answers) {
          if (a.type === 'OpenEnded') map.set(a.questionId, a.creditPercent ?? 0);
        }
        this.credits.set(map);
        this.passed.set(detail.passed ?? false);
        this.loadingDetail.set(false);
      },
      error: (err) => {
        this.loadingDetail.set(false);
        this.selected.set(null);
        this.notification.fromHttpError(err, 'Deneme yüklenemedi.');
      },
    });
  }

  backToList(): void {
    this.selected.set(null);
    this.loadAttempts(); // değişiklikler listeye yansısın
  }

  creditFor(questionId: number): number {
    return this.credits().get(questionId) ?? 0;
  }

  // Puan girişi alandan çıkınca (blur/enter) 0-100'e oturtulur:
  // yazarken kullanıcı serbest, çıkınca hem kutu hem saklanan değer düzeltilir.
  // (Her tuşta sıkıştırıp geri yazmak "021382 → 10082" gibi çöp görünüme yol açıyordu.)
  onCreditChange(questionId: number, el: HTMLInputElement): void {
    const clamped = Math.max(0, Math.min(100, Math.round(Number(el.value) || 0)));
    this.credits.update((m) => new Map(m).set(questionId, clamped));
    el.value = String(clamped); // kutuyu her zaman geçerli değere oturt
  }

  // Önizleme: nihai puan = tüm soruların kredi ortalaması (MC otomatik + açık uçlu girilen)
  readonly previewScore = computed(() => {
    const d = this.selected();
    if (!d || !d.answers?.length) return null;
    const total = d.answers.reduce((sum, a) => {
      const c = a.type === 'OpenEnded' ? this.creditFor(a.questionId) : (a.creditPercent ?? 0);
      return sum + c;
    }, 0);
    return Math.round(total / d.answers.length);
  });

  saveEvaluation(): void {
    const d = this.selected();
    if (!d || this.saving()) return;
    const dto: EvaluateAttempt = {
      credits: d.answers
        .filter((a) => a.type === 'OpenEnded')
        .map((a) => ({ questionId: a.questionId, creditPercent: this.creditFor(a.questionId) })),
      passed: this.passed(),
    };
    this.saving.set(true);
    this.examService.evaluate(this.courseId(), this.examId(), d.attemptId, dto).subscribe({
      next: () => {
        this.saving.set(false);
        this.notification.success('Değerlendirme kaydedildi.');
        this.backToList();
      },
      error: (err) => {
        this.saving.set(false);
        this.notification.fromHttpError(err, 'Değerlendirme kaydedilemedi.');
      },
    });
  }
}
