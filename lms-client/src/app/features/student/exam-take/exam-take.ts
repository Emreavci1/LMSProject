import { Component, OnDestroy, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';
import { SaveAnswers, StudentAttempt, StudentExam, StudentResult } from '../../../core/models/exam.models';
import { ExamService } from '../../../core/services/exam.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ProgressService } from '../../../core/services/progress.service';

// Öğrenci: sınav çözme sayfası. Route: /learn/:courseId/exam/:examId
// Durumlar: yükleniyor · kilitli · giriş (başlat) · çözme · sonuç
@Component({
  selector: 'app-exam-take',
  imports: [
    RouterLink,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './exam-take.html',
  styleUrl: './exam-take.scss',
})
export class ExamTake implements OnDestroy {
  readonly courseId = input.required<string>();
  readonly examId = input.required<string>();

  private examService = inject(ExamService);
  private notification = inject(NotificationService);
  private progress = inject(ProgressService);
  private router = inject(Router);

  readonly exam = signal<StudentExam | null>(null);
  readonly loading = signal(true);
  readonly notFound = signal(false);

  // Çözme durumu
  readonly attempt = signal<StudentAttempt | null>(null);
  // Cevaplar: soruId → { selectedOptionId?, textAnswer? }
  readonly answers = signal<Map<number, { selectedOptionId?: number | null; textAnswer?: string | null }>>(new Map());
  readonly remaining = signal<number | null>(null); // süreli sınavda kalan saniye
  readonly saving = signal(false);
  readonly submitting = signal(false);
  // Gönderim sonrası sonuç ekranı
  readonly justSubmitted = signal(false);
  readonly submitResult = signal<StudentResult | null>(null);

  private timer: ReturnType<typeof setInterval> | null = null;

  readonly backLink = computed(() => ['/learn', this.courseId()]);

  // examId değişince sınav durumunu yükle
  private readonly _load = effect(() => {
    const examId = Number(this.examId());
    this.loadExam(examId);
  });

  private loadExam(examId: number): void {
    this.loading.set(true);
    this.notFound.set(false);
    this.examService.getStudentExam(examId).subscribe({
      next: (e) => {
        this.exam.set(e);
        this.loading.set(false);
        // Devam eden deneme varsa doğrudan çözme moduna gir (resume)
        if (e.activeAttempt) this.enterTaking(e.activeAttempt);
      },
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
      },
    });
  }

  // --- Görünüm türetme ---
  readonly view = computed<'loading' | 'notfound' | 'locked' | 'result' | 'taking' | 'intro'>(() => {
    if (this.loading()) return 'loading';
    if (this.notFound() || !this.exam()) return 'notfound';
    if (this.attempt()) return 'taking';
    if (this.justSubmitted()) return 'result';
    if (!this.exam()!.isUnlocked) return 'locked';
    return 'intro';
  });

  readonly isTimed = computed(() => this.exam()?.timeLimitMin != null);

  // --- Deneme başlat ---
  start(): void {
    const examId = Number(this.examId());
    this.examService.startAttempt(examId).subscribe({
      next: (a) => this.enterTaking(a),
      error: (err) => this.notification.fromHttpError(err, 'Sınav başlatılamadı.'),
    });
  }

  private enterTaking(a: StudentAttempt): void {
    this.attempt.set(a);
    this.justSubmitted.set(false);

    // Kayıtlı cevapları haritaya doldur (resume)
    const map = new Map<number, { selectedOptionId?: number | null; textAnswer?: string | null }>();
    for (const ans of a.answers) {
      map.set(ans.questionId, { selectedOptionId: ans.selectedOptionId, textAnswer: ans.textAnswer });
    }
    this.answers.set(map);

    // Süreli sınav: geri sayımı başlat
    this.stopTimer();
    if (a.remainingSeconds != null) {
      this.remaining.set(a.remainingSeconds);
      this.timer = setInterval(() => this.tick(), 1000);
    } else {
      this.remaining.set(null);
    }
  }

  private tick(): void {
    const r = this.remaining();
    if (r == null) return;
    if (r <= 1) {
      this.remaining.set(0);
      this.stopTimer();
      // Süre doldu: kayıtlı+mevcut cevaplarla otomatik gönder
      this.submit(true);
      return;
    }
    this.remaining.set(r - 1);
  }

  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  // mm:ss biçimi
  readonly remainingLabel = computed(() => {
    const r = this.remaining();
    if (r == null) return '';
    const m = Math.floor(r / 60).toString().padStart(2, '0');
    const s = (r % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  });

  // --- Cevap işlemleri ---
  selectedOption(questionId: number): number | null {
    return this.answers().get(questionId)?.selectedOptionId ?? null;
  }
  textFor(questionId: number): string {
    return this.answers().get(questionId)?.textAnswer ?? '';
  }

  setOption(questionId: number, optionId: number): void {
    this.answers.update((m) => {
      const next = new Map(m);
      next.set(questionId, { selectedOptionId: optionId });
      return next;
    });
  }

  setText(questionId: number, text: string): void {
    this.answers.update((m) => {
      const next = new Map(m);
      next.set(questionId, { textAnswer: text });
      return next;
    });
  }

  // Cevaplanan soru sayısı (ilerleme göstergesi)
  readonly answeredCount = computed(() => {
    let n = 0;
    for (const [, a] of this.answers()) {
      if (a.selectedOptionId != null || (a.textAnswer && a.textAnswer.trim())) n++;
    }
    return n;
  });

  private buildPayload(): SaveAnswers {
    const list: SaveAnswers['answers'] = [];
    for (const [questionId, a] of this.answers()) {
      list.push({
        questionId,
        selectedOptionId: a.selectedOptionId ?? null,
        textAnswer: a.textAnswer ?? null,
      });
    }
    return { answers: list };
  }

  // --- Taslak kaydet (özellikle süresiz sınavda "sonra devam et") ---
  save(): void {
    const a = this.attempt();
    if (!a || this.saving()) return;
    this.saving.set(true);
    this.examService.saveAnswers(Number(this.examId()), a.id, this.buildPayload()).subscribe({
      next: () => {
        this.saving.set(false);
        this.notification.success('Cevaplar kaydedildi. Daha sonra devam edebilirsin.');
      },
      error: (err) => {
        this.saving.set(false);
        // Süre dolduysa backend 400 döner → durumu yeniden yükle (gönderilmiş görünür)
        this.notification.fromHttpError(err, 'Kaydedilemedi.');
        this.stopTimer();
        this.attempt.set(null);
        this.loadExam(Number(this.examId()));
      },
    });
  }

  // --- Gönder ---
  submit(auto = false): void {
    const a = this.attempt();
    if (!a || this.submitting()) return;
    if (!auto && !confirm('Sınavı göndermek istediğine emin misin? Gönderdikten sonra bu deneme değiştirilemez.')) {
      return;
    }
    this.submitting.set(true);
    this.stopTimer();
    this.examService.submitAttempt(Number(this.examId()), a.id, this.buildPayload()).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.attempt.set(null);
        this.submitResult.set(res);
        this.justSubmitted.set(true);
        this.progress.loadExams(); // ilerleme çubuğuna yansısın
        this.notification.success(auto ? 'Süre doldu; sınav otomatik gönderildi.' : 'Sınav gönderildi.');
      },
      error: (err) => {
        this.submitting.set(false);
        this.notification.fromHttpError(err, 'Sınav gönderilemedi.');
      },
    });
  }

  goBackToCourse(): void {
    this.router.navigate(this.backLink());
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }
}
