import { Component, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Exam, ExamListItem, QuestionType, SaveExam } from '../../../core/models/exam.models';
import { ExamService } from '../../../core/services/exam.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ExamResults } from '../exam-results/exam-results';

// Form taslağı (draft) tipleri — kaydedilene kadar yerelde tutulur.
// Backend'e SaveExam olarak dönüştürülür.
interface OptionDraft {
  text: string;
  isCorrect: boolean;
}
interface QuestionDraft {
  type: QuestionType;
  text: string;
  options: OptionDraft[];
}
interface ExamDraft {
  title: string;
  description: string;
  hasTimeLimit: boolean; // UI: "süre sınırı olsun mu" anahtarı
  timeLimitMin: number | null;
  maxAttempts: number;
  questions: QuestionDraft[];
}

// Kurs yönetim sayfasındaki "Sınavlar" sekmesi.
// Kendi kendine yeter: sınav listeler + oluşturur/düzenler/siler.
// Yalnızca kursun sahibi eğitmen/Admin bu sayfaya erişebildiği için ayrı yetki kontrolü yok
// (backend her istekte sahipliği ayrıca doğrular).
@Component({
  selector: 'app-exam-editor',
  imports: [FormsModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule, ExamResults],
  templateUrl: './exam-editor.html',
  styleUrl: './exam-editor.scss',
})
export class ExamEditor {
  readonly courseId = input.required<number>();

  private examService = inject(ExamService);
  private notification = inject(NotificationService);

  readonly exams = signal<ExamListItem[]>([]);
  readonly loading = signal(true);

  // Görünüm: 'list' = sınav listesi, 'form' = oluştur/düzenle formu, 'results' = sonuç/değerlendirme
  readonly view = signal<'list' | 'form' | 'results'>('list');
  // Sonuçları görüntülenen sınav (değerlendirme için)
  readonly resultsExam = signal<ExamListItem | null>(null);
  // Düzenlenen sınavın id'si (null = yeni sınav oluşturuluyor)
  readonly editingId = signal<number | null>(null);
  readonly draft = signal<ExamDraft>(this.emptyDraft());
  readonly saving = signal(false);
  // Düzenlemeye girerken sınav detayı yükleniyor
  readonly loadingDetail = signal(false);

  // courseId değişince sınav listesini yükle
  private readonly _load = effect(() => {
    const courseId = this.courseId();
    this.loadExams(courseId);
  });

  private loadExams(courseId: number): void {
    this.loading.set(true);
    this.examService.getByCourse(courseId).subscribe({
      next: (list) => {
        this.exams.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.exams.set([]);
        this.loading.set(false);
      },
    });
  }

  // --- Boş taslak yardımcıları ---
  private emptyDraft(): ExamDraft {
    return {
      title: '',
      description: '',
      hasTimeLimit: false,
      timeLimitMin: 30,
      maxAttempts: 1,
      questions: [this.blankQuestion()],
    };
  }

  private blankQuestion(): QuestionDraft {
    // Yeni soru varsayılan çoktan seçmeli, 2 boş şık (ilki doğru işaretli)
    return {
      type: 'MultipleChoice',
      text: '',
      options: [
        { text: '', isCorrect: true },
        { text: '', isCorrect: false },
      ],
    };
  }

  // --- Form aç/kapat ---
  startCreate(): void {
    this.editingId.set(null);
    this.draft.set(this.emptyDraft());
    this.view.set('form');
  }

  startEdit(exam: ExamListItem): void {
    this.editingId.set(exam.id);
    this.view.set('form');
    this.loadingDetail.set(true);
    // Detayı (sorular + doğru şıklar) çek, taslağa çevir
    this.examService.getById(this.courseId(), exam.id).subscribe({
      next: (full) => {
        this.draft.set(this.toDraft(full));
        this.loadingDetail.set(false);
      },
      error: (err) => {
        this.loadingDetail.set(false);
        this.view.set('list');
        this.notification.fromHttpError(err, 'Sınav yüklenemedi.');
      },
    });
  }

  cancel(): void {
    this.view.set('list');
  }

  // Bir sınavın öğrenci sonuçlarını / değerlendirmesini aç
  openResults(exam: ExamListItem): void {
    this.resultsExam.set(exam);
    this.view.set('results');
  }

  closeResults(): void {
    this.resultsExam.set(null);
    this.view.set('list');
  }

  private toDraft(exam: Exam): ExamDraft {
    return {
      title: exam.title,
      description: exam.description ?? '',
      hasTimeLimit: exam.timeLimitMin != null,
      timeLimitMin: exam.timeLimitMin ?? 30,
      maxAttempts: exam.maxAttempts,
      questions: exam.questions.map((q) => ({
        type: q.type,
        text: q.text,
        options: q.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })),
      })),
    };
  }

  // --- Sınav üst alanları ---
  setTitle(v: string): void {
    this.draft.update((d) => ({ ...d, title: v }));
  }
  setDescription(v: string): void {
    this.draft.update((d) => ({ ...d, description: v }));
  }
  setHasTimeLimit(v: boolean): void {
    this.draft.update((d) => ({ ...d, hasTimeLimit: v }));
  }
  setTimeLimit(v: number): void {
    this.draft.update((d) => ({ ...d, timeLimitMin: v }));
  }
  setMaxAttempts(v: number): void {
    this.draft.update((d) => ({ ...d, maxAttempts: v }));
  }

  // --- Soru işlemleri ---
  addQuestion(): void {
    this.draft.update((d) => ({ ...d, questions: [...d.questions, this.blankQuestion()] }));
  }

  removeQuestion(qi: number): void {
    this.draft.update((d) => ({ ...d, questions: d.questions.filter((_, i) => i !== qi) }));
  }

  setQuestionType(qi: number, type: QuestionType): void {
    this.draft.update((d) => ({
      ...d,
      questions: d.questions.map((q, i) => {
        if (i !== qi) return q;
        // Çoktan seçmeliye geçerken en az 2 şık garanti et
        const options =
          type === 'MultipleChoice' && q.options.length < 2
            ? [
                { text: '', isCorrect: true },
                { text: '', isCorrect: false },
              ]
            : q.options;
        return { ...q, type, options };
      }),
    }));
  }

  setQuestionText(qi: number, text: string): void {
    this.patchQuestion(qi, { text });
  }

  // --- Şık işlemleri (yalnızca çoktan seçmeli) ---
  addOption(qi: number): void {
    this.draft.update((d) => ({
      ...d,
      questions: d.questions.map((q, i) =>
        i === qi ? { ...q, options: [...q.options, { text: '', isCorrect: false }] } : q
      ),
    }));
  }

  removeOption(qi: number, oi: number): void {
    this.draft.update((d) => ({
      ...d,
      questions: d.questions.map((q, i) => {
        if (i !== qi) return q;
        const options = q.options.filter((_, j) => j !== oi);
        // Silinen doğru şıksa ve başka doğru kalmadıysa ilkini doğru yap
        if (options.length > 0 && !options.some((o) => o.isCorrect)) {
          options[0] = { ...options[0], isCorrect: true };
        }
        return { ...q, options };
      }),
    }));
  }

  setOptionText(qi: number, oi: number, text: string): void {
    this.draft.update((d) => ({
      ...d,
      questions: d.questions.map((q, i) =>
        i === qi
          ? { ...q, options: q.options.map((o, j) => (j === oi ? { ...o, text } : o)) }
          : q
      ),
    }));
  }

  // Doğru şık seçimi tekli (radio): seçilen doğru, diğerleri yanlış olur
  setCorrect(qi: number, oi: number): void {
    this.draft.update((d) => ({
      ...d,
      questions: d.questions.map((q, i) =>
        i === qi
          ? { ...q, options: q.options.map((o, j) => ({ ...o, isCorrect: j === oi })) }
          : q
      ),
    }));
  }

  private patchQuestion(qi: number, changes: Partial<QuestionDraft>): void {
    this.draft.update((d) => ({
      ...d,
      questions: d.questions.map((q, i) => (i === qi ? { ...q, ...changes } : q)),
    }));
  }

  // --- Kaydet ---
  save(): void {
    const d = this.draft();
    const title = d.title.trim();
    if (!title) {
      this.notification.error('Sınav başlığı boş olamaz.');
      return;
    }
    if (d.questions.length === 0) {
      this.notification.error('Sınavda en az bir soru olmalı.');
      return;
    }
    if (d.hasTimeLimit && (!d.timeLimitMin || d.timeLimitMin < 1)) {
      this.notification.error('Süre sınırı en az 1 dakika olmalı.');
      return;
    }
    if (d.maxAttempts < 1 || d.maxAttempts > 20) {
      this.notification.error('Deneme hakkı 1-20 arası olmalı.');
      return;
    }

    // Soru bazlı doğrulama (backend ile aynı kurallar)
    for (let i = 0; i < d.questions.length; i++) {
      const q = d.questions[i];
      if (!q.text.trim()) {
        this.notification.error(`${i + 1}. sorunun metni boş olamaz.`);
        return;
      }
      if (q.type === 'MultipleChoice') {
        const filled = q.options.filter((o) => o.text.trim());
        if (filled.length < 2) {
          this.notification.error(`${i + 1}. soruda en az 2 dolu şık olmalı.`);
          return;
        }
        if (!filled.some((o) => o.isCorrect)) {
          this.notification.error(`${i + 1}. soruda doğru şık işaretlenmeli.`);
          return;
        }
      }
    }

    const dto: SaveExam = {
      title,
      description: d.description.trim() || null,
      timeLimitMin: d.hasTimeLimit ? d.timeLimitMin : null,
      maxAttempts: d.maxAttempts,
      questions: d.questions.map((q) => ({
        type: q.type,
        text: q.text.trim(),
        // Yalnızca çoktan seçmelide dolu şıklar gönderilir; açık uçluda boş
        options:
          q.type === 'MultipleChoice'
            ? q.options
                .filter((o) => o.text.trim())
                .map((o) => ({ text: o.text.trim(), isCorrect: o.isCorrect }))
            : [],
      })),
    };

    this.saving.set(true);
    const editingId = this.editingId();
    const request$ =
      editingId == null
        ? this.examService.create(this.courseId(), dto)
        : this.examService.update(this.courseId(), editingId, dto);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.view.set('list');
        this.loadExams(this.courseId());
        this.notification.success(editingId == null ? 'Sınav oluşturuldu.' : 'Sınav güncellendi.');
      },
      error: (err) => {
        this.saving.set(false);
        this.notification.fromHttpError(err, 'Sınav kaydedilemedi.');
      },
    });
  }

  // --- Sil ---
  deleteExam(exam: ExamListItem): void {
    if (!confirm(`"${exam.title}" sınavını silmek istediğine emin misin?`)) return;
    this.examService.remove(this.courseId(), exam.id).subscribe({
      next: () => {
        this.exams.update((list) => list.filter((e) => e.id !== exam.id));
        this.notification.success('Sınav silindi.');
      },
      error: (err) => this.notification.fromHttpError(err, 'Sınav silinemedi.'),
    });
  }
}
