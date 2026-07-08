import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router, RouterModule } from '@angular/router';
import { concatMap, from, toArray } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { CourseService } from '../../../core/services/course.service';
import { CourseStatus } from '../../../core/models/course.models';
import { CreateLesson } from '../../../core/models/lesson.models';
import { LessonService } from '../../../core/services/lesson.service';
import { MockDataService } from '../../../core/services/mock-data.service';
import { NotificationService } from '../../../core/services/notification.service';
import { coverCss } from '../../../core/utils/cover.util';
import { ImageCropperDialog } from '../../../shared/components/image-cropper-dialog/image-cropper-dialog';

export type ContentType = 'Video' | 'Document' | 'Text';

export interface DraftLesson {
  title: string;
  description?: string;
  section: string;
  contentType: ContentType;
  durationMin?: number | null;
  contentUrl?: string;
  textContent?: string;
  // Eğitmenin ders notları (oynatıcıdaki "Notlar" sekmesinde gösterilir)
  notes?: string;
}

@Component({
  selector: 'app-course-create',
  imports: [
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    DragDropModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule
  ],
  templateUrl: './course-create.html',
  styleUrl: './course-create.scss',
})
export class CourseCreate {
  private fb = inject(FormBuilder);
  protected mock = inject(MockDataService); // yalnızca kategori listesi için
  private auth = inject(AuthService);
  private courseService = inject(CourseService);
  private lessonService = inject(LessonService);
  private notification = inject(NotificationService);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private sanitizer = inject(DomSanitizer);

  // Kaydetme sırasında butonları kilitlemek için
  readonly saving = signal(false);

  // Template'ten kapak CSS'i üretmek için (gradient/url ayrımını util yapar)
  protected readonly coverCss = coverCss;

  // MANUEL STEP KONTROLÜ
  readonly currentStep = signal<number>(1);

  // Bugünün tarihi (date input min değeri için)
  protected readonly todayStr = new Date().toISOString().split('T')[0];
  // Önizlemede gösterilecek eğitmen adı
  readonly instructorName = computed(() => this.auth.currentUser()?.fullName ?? 'Eğitmen');

  readonly levels = ['Başlangıç', 'Orta', 'İleri'] as const;
  readonly contentTypes: { value: ContentType, label: string }[] = [
    { value: 'Video', label: 'Video Bağlantısı' },
    { value: 'Document', label: 'Döküman (PDF / Sunum)' },
    { value: 'Text', label: 'Okuma Metni' }
  ];

  readonly coverImagePreview = signal<string | null>(null);

  // --- Kapak rengi (foto yüklemek opsiyonel; foto yoksa seçilen renk arka plan olur) ---
  readonly coverColors = [
    '#0284C7', '#16A34A', '#7C3AED', '#DC2626',
    '#EA580C', '#0D9488', '#DB2777', '#475569',
  ];
  readonly coverColor = signal<string | null>(null);

  // Seçilen renkten üretilen gradient (demo kapaklarla aynı stil)
  readonly coverColorGradient = computed(() => {
    const color = this.coverColor();
    return color ? `linear-gradient(135deg, ${color}, #0F172A)` : null;
  });

  // Kaydedilecek kapak değeri: foto varsa foto, yoksa renk gradient'i, o da yoksa null
  readonly effectiveCover = computed(
    () => this.coverImagePreview() ?? this.coverColorGradient()
  );

  removeCoverImage(): void {
    this.coverImagePreview.set(null);
  }

  readonly infoForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    category: ['', [Validators.required]],
    level: ['Başlangıç', [Validators.required]],
    description: ['', [Validators.required, Validators.maxLength(2000)]],
  });

  onFileSelected(event: Event) {
    const dialogRef = this.dialog.open(ImageCropperDialog, {
      width: '600px',
      data: { imageChangedEvent: event }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.coverImagePreview.set(result);
      }
      const input = event.target as HTMLInputElement;
      if (input) {
        input.value = '';
      }
    });
  }

  readonly draftLessons = signal<DraftLesson[]>([]);
  readonly newTitle = signal('');
  readonly newDescription = signal('');
  readonly newSection = signal('');
  readonly newContentType = signal<ContentType>('Video');
  readonly newDuration = signal<number | null>(null);
  readonly newContentUrl = signal('');
  readonly newTextContent = signal('');
  readonly newNotes = signal('');

  addDraftLesson(): void {
    const title = this.newTitle().trim();
    if (!title) {
      this.notification.error('Ders başlığı boş olamaz.');
      return;
    }
    const type = this.newContentType();
    if (type === 'Video' && !this.newContentUrl().trim()) {
      this.notification.error('Video linki girmelisiniz.');
      return;
    }
    if (type === 'Document' && !this.newContentUrl().trim()) {
      this.notification.error('Döküman yüklemelisiniz.');
      return;
    }
    if (type === 'Text' && !this.newTextContent().trim()) {
      this.notification.error('Okuma metni içeriği boş olamaz.');
      return;
    }

    this.draftLessons.update((list) => [
      ...list,
      {
        title,
        description: this.newDescription().trim() || undefined,
        section: this.newSection().trim() || 'Genel',
        contentType: type,
        durationMin: this.newDuration() || null,
        contentUrl: type !== 'Text' ? this.newContentUrl().trim() : undefined,
        textContent: type === 'Text' ? this.newTextContent().trim() : undefined,
        notes: this.newNotes().trim() || undefined
      },
    ]);

    this.newTitle.set('');
    this.newDescription.set('');
    this.newDuration.set(null);
    this.newContentUrl.set('');
    this.newTextContent.set('');
    this.newNotes.set('');
  }

  onMaterialFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.newContentUrl.set(`fake-url-for-${file.name}`);
      this.notification.success(`${file.name} başarıyla eklendi (Mock).`);
    }
  }

  removeDraftLesson(index: number): void {
    // Silinen önizlemedeyse önizlemeyi kapat
    if (this.previewIndex() === index) this.previewIndex.set(null);
    this.draftLessons.update((list) => list.filter((_, i) => i !== index));
  }

  // Sürükle-bırak ile sıralama (ok butonları yerine)
  dropDraftLesson(event: CdkDragDrop<DraftLesson[]>): void {
    this.previewIndex.set(null);
    this.draftLessons.update((list) => {
      const copy = [...list];
      moveItemInArray(copy, event.previousIndex, event.currentIndex);
      return copy;
    });
  }

  // --- Ders içerik önizlemesi (tıklayınca açılır) ---
  readonly previewIndex = signal<number | null>(null);

  togglePreview(index: number): void {
    this.previewIndex.set(this.previewIndex() === index ? null : index);
  }

  readonly previewLesson = computed<DraftLesson | null>(() => {
    const i = this.previewIndex();
    return i === null ? null : this.draftLessons()[i] ?? null;
  });

  // Adım 3 player önizlemesi: seçili yoksa ilk ders aktif
  readonly activePreview = computed<DraftLesson | null>(
    () => this.previewLesson() ?? this.draftLessons()[0] ?? null
  );

  // Dersleri bölümlere göre grupla (sıra korunur) — player içerik paneli için
  readonly draftSections = computed(() => {
    const groups: { section: string; items: { lesson: DraftLesson; index: number }[] }[] = [];
    this.draftLessons().forEach((lesson, index) => {
      let group = groups.find((g) => g.section === lesson.section);
      if (!group) {
        group = { section: lesson.section, items: [] };
        groups.push(group);
      }
      group.items.push({ lesson, index });
    });
    return groups;
  });

  // Video linkini gömülebilir (YouTube embed) URL'e çevirir; değilse null döner
  videoEmbedUrl(url: string | undefined): SafeResourceUrl | null {
    if (!url) return null;
    const match = url.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/
    );
    if (!match) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.youtube.com/embed/${match[1]}`
    );
  }

  totalDuration(): number {
    return this.draftLessons().reduce((sum, l) => sum + (l.durationMin || 0), 0);
  }

  // STEP YÖNETİMİ
  nextStep() {
    if (this.currentStep() === 1 && this.infoForm.invalid) {
      this.notification.error('Lütfen tüm zorunlu alanları doldurun.');
      return;
    }
    this.currentStep.set(this.currentStep() + 1);
  }

  prevStep() {
    this.currentStep.set(this.currentStep() - 1);
  }

  // Zamanlanmış yayın tarihi (opsiyonel, YYYY-MM-DD)
  readonly publishDate = signal<string>('');

  // Seçilen tarih bugünden ileri mi? (zamanlanmış yayın kararı için)
  readonly isFutureDate = computed(() => {
    const d = this.publishDate();
    if (!d) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(d) > today;
  });

  // Ortak kayıt mantığı — kursu gerçek API'ye POST eder.
  // NOT: Dersler backend'de tutulmuyor (spec gereği); yalnızca sayı/süre gönderilir.
  private saveCourse(status: CourseStatus, successMsg: string): void {
    if (this.infoForm.invalid || this.draftLessons().length === 0 || this.saving()) return;

    const info = this.infoForm.getRawValue();
    this.saving.set(true);

    this.courseService
      .create({
        title: info.title,
        description: info.description,
        coverImageUrl: this.effectiveCover(), // foto (dataURL) > renk gradient'i > null
        category: info.category,
        level: info.level,
        durationHours: Math.max(1, Math.round(this.totalDuration() / 60)),
        lessonCount: this.draftLessons().length,
        status,
        publishDate: status === 'Scheduled' ? this.publishDate() : null,
      })
      .subscribe({
        next: (created) => {
          const drafts = this.draftLessons();
          if (drafts.length === 0) {
            this.finishCreate(successMsg);
            return;
          }

          // Dersleri API'ye SIRAYLA ekle (backend her dersi sona ekler; sıra korunsun).
          // Artık localStorage değil, gerçek veritabanı — dersler kalıcı.
          from(drafts)
            .pipe(
              concatMap((l) => this.lessonService.create(created.id, this.toCreateLesson(l))),
              toArray()
            )
            .subscribe({
              next: () => this.finishCreate(successMsg),
              error: () => {
                // Kurs oluştu ama dersler eklenirken hata oldu — yine de Yönet sayfasına yönlendir
                this.saving.set(false);
                this.notification.error(
                  'Eğitim oluşturuldu ancak bazı dersler eklenemedi. Yönet sayfasından tekrar ekleyebilirsin.'
                );
                this.router.navigate(['/instructor/courses', created.id]);
              },
            });
        },
        error: () => {
          this.saving.set(false);
          this.notification.error('Eğitim kaydedilemedi. Lütfen tekrar dene.');
        },
      });
  }

  // Taslak dersi API'nin beklediği CreateLesson biçimine çevir
  private toCreateLesson(l: DraftLesson): CreateLesson {
    return {
      section: l.section,
      title: l.title,
      description: l.description ?? null,
      durationMin: l.durationMin || 0,
      contentType: l.contentType,
      contentUrl: l.contentType !== 'Text' ? (l.contentUrl ?? null) : null,
      textContent: l.contentType === 'Text' ? (l.textContent ?? null) : null,
      notes: l.notes ?? null,
    };
  }

  // Kurs + dersler başarıyla oluşturuldu: bildir ve listeye dön
  private finishCreate(msg: string): void {
    this.notification.success(msg);
    this.router.navigate(['/instructor/courses']);
  }

  // Taslak olarak kaydet: yalnızca eğitmen görür, öğrencilere yayınlanmaz
  saveDraft(): void {
    this.saveCourse(
      'Draft',
      'Eğitim taslak olarak kaydedildi. Eğitimlerim sayfasından yayınlayabilirsin.'
    );
  }

  // Yayınla: tarih ileriyse zamanlanmış, değilse hemen yayında
  publish(): void {
    if (this.isFutureDate()) {
      this.saveCourse('Scheduled', `Eğitim ${this.publishDate()} tarihinde yayınlanmak üzere zamanlandı.`);
    } else {
      this.saveCourse('Published', 'Eğitim başarıyla yayınlandı!');
    }
  }
}
