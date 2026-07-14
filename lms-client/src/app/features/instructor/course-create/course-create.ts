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
import { UploadService } from '../../../core/services/upload.service';
import { coverCss } from '../../../core/utils/cover.util';
import { fileUrl } from '../../../core/utils/file-url.util';
import { ImageCropperDialog } from '../../../shared/components/image-cropper-dialog/image-cropper-dialog';

import { LessonContentType } from '../../../core/models/lesson.models';

export type ContentType = LessonContentType;

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
  // Yüklenen dosyanın orijinal adı (yalnızca listede göstermek için, API'ye gitmez)
  fileName?: string;
  // Ders yükü (kredi): 1 varsayılan; 2/3 ilerlemeye daha çok etki eder
  weight?: number;
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
  private uploadService = inject(UploadService);
  private notification = inject(NotificationService);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private sanitizer = inject(DomSanitizer);

  // Kaydetme sırasında butonları kilitlemek için
  readonly saving = signal(false);

  // Template'ten kapak CSS'i üretmek için (gradient/url ayrımını util yapar)
  protected readonly coverCss = coverCss;
  // Göreli /uploads yolunu tam adrese çevirir (önizlemelerde img/video/a için)
  protected readonly fileUrl = fileUrl;

  // MANUEL STEP KONTROLÜ
  readonly currentStep = signal<number>(1);

  // Bugünün tarihi (date input min değeri için)
  protected readonly todayStr = new Date().toISOString().split('T')[0];
  // Önizlemede gösterilecek eğitmen adı
  readonly instructorName = computed(() => this.auth.currentUser()?.fullName ?? 'Eğitmen');

  // Zorunlu eğitim işareti — eğitmen ve Admin işaretleyebilir (atamayı Admin yapar)
  readonly isMandatory = signal(false);

  // Kayıt/iptal sonrası dönülecek liste: Admin → Eğitim Yönetimi, eğitmen → Eğitimlerim
  readonly coursesLink = computed(() =>
    this.auth.role() === 'Admin' ? '/admin/courses' : '/instructor/courses'
  );

  readonly levels = ['Başlangıç', 'Orta', 'İleri'] as const;
  // 5 içerik tipi. Link ve Text bugün tam çalışır;
  // Image/Document/Video dosya yükleme ile çalışacak (depolama altyapısı yakında).
  readonly contentTypes: { value: ContentType, label: string }[] = [
    { value: 'Link', label: 'URL Bağlantısı' },
    { value: 'Image', label: 'Fotoğraf Yükle' },
    { value: 'Text', label: 'Okuma Metni' },
    { value: 'Document', label: 'Sunum / PDF Yükle' },
    { value: 'Video', label: 'Video Yükle' }
  ];

  // Tip başına gösterim etiketi/ikonu (template'lerde iç içe ternary yerine)
  contentTypeLabel(type: ContentType): string {
    switch (type) {
      case 'Link': return 'URL Bağlantısı';
      case 'Image': return 'Fotoğraf';
      case 'Text': return 'Okuma Metni';
      case 'Document': return 'Sunum / PDF';
      case 'Video': return 'Video';
    }
  }

  contentTypeIcon(type: ContentType): string {
    switch (type) {
      case 'Link': return 'link';
      case 'Image': return 'image';
      case 'Text': return 'article';
      case 'Document': return 'picture_as_pdf';
      case 'Video': return 'play_circle';
    }
  }

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
  readonly newContentType = signal<ContentType>('Link');
  readonly newDuration = signal<number | null>(null);
  // Ders yükü (kredi): 1 varsayılan
  readonly newWeight = signal<number>(1);
  readonly newContentUrl = signal('');
  readonly newTextContent = signal('');
  readonly newNotes = signal('');
  // Dosya yükleme durumu (Image/Document/Video tipleri için)
  readonly uploadingFile = signal(false);
  readonly newUploadedFileName = signal('');

  // İçerik tipi değişince önceki tipe ait içerik alanlarını sıfırla
  // (örn. Link'ten Image'a geçince eski URL yeni derse sızmasın)
  onContentTypeChange(type: ContentType): void {
    this.newContentType.set(type);
    this.newContentUrl.set('');
    this.newTextContent.set('');
    this.newUploadedFileName.set('');
  }

  // Dosya seçilir seçilmez sunucuya yüklenir; dönen yol ContentUrl olarak saklanır
  onLessonFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploadingFile.set(true);
    this.uploadService.upload(file, this.newContentType()).subscribe({
      next: (result) => {
        this.newContentUrl.set(result.url);
        this.newUploadedFileName.set(result.fileName);
        this.uploadingFile.set(false);
        this.notification.success(`"${result.fileName}" yüklendi.`);
      },
      error: (err) => {
        this.uploadingFile.set(false);
        this.notification.fromHttpError(err, 'Dosya yüklenemedi.');
      },
    });
    input.value = ''; // aynı dosya tekrar seçilebilsin
  }

  addDraftLesson(): void {
    const title = this.newTitle().trim();
    if (!title) {
      this.notification.error('Ders başlığı boş olamaz.');
      return;
    }
    const type = this.newContentType();
    if (type === 'Link' && !this.newContentUrl().trim()) {
      this.notification.error('Bağlantı adresi (URL) girmelisiniz.');
      return;
    }
    if (type === 'Text' && !this.newTextContent().trim()) {
      this.notification.error('Okuma metni içeriği boş olamaz.');
      return;
    }
    // Yükleme tipleri artık dosya ister (upload çalışıyor; ders sonradan düzenlenemiyor)
    if ((type === 'Image' || type === 'Document' || type === 'Video') && !this.newContentUrl()) {
      this.notification.error('Önce dosyayı yüklemelisiniz.');
      return;
    }
    if (this.uploadingFile()) {
      this.notification.error('Dosya yüklemesi sürüyor, lütfen bekleyin.');
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
        notes: this.newNotes().trim() || undefined,
        fileName: this.newUploadedFileName() || undefined,
        weight: this.newWeight(),
      },
    ]);

    this.newTitle.set('');
    this.newDescription.set('');
    this.newDuration.set(null);
    this.newContentUrl.set('');
    this.newTextContent.set('');
    this.newNotes.set('');
    this.newUploadedFileName.set('');
    this.newWeight.set(1);
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

  // Zamanlanmış yayın tarihi + saati (opsiyonel)
  readonly publishDate = signal<string>('');
  readonly publishTime = signal<string>('09:00');

  // Seçilen tarih+saat şu andan ileri mi? (zamanlanmış yayın kararı için)
  readonly isFutureDate = computed(() => {
    const d = this.publishDate();
    if (!d) return false;
    return new Date(`${d}T${this.publishTime() || '09:00'}`) > new Date();
  });

  // Yerel tarih+saat → UTC ISO (backend UTC saklar; otomatik yayınlayıcı UTC karşılaştırır)
  private publishDateIso(): string {
    return new Date(`${this.publishDate()}T${this.publishTime() || '09:00'}`).toISOString();
  }

  // Ortak kayıt mantığı — kursu gerçek API'ye POST eder.
  // NOT: Dersler backend'de tutulmuyor (spec gereği); yalnızca sayı/süre gönderilir.
  private saveCourse(status: CourseStatus, successMsg: string): void {
    if (this.infoForm.invalid || this.draftLessons().length === 0 || this.saving()) return;

    this.saving.set(true);

    // Kapak foto ise (kırpıcıdan dataURL gelir) ÖNCE sunucuya dosya olarak yükle.
    // dataURL'i DB'ye yazmak kurs listelerini MB'larca şişiriyordu (performans!) —
    // DB'de yalnızca dosya yolu (/uploads/images/...) tutulur.
    const cover = this.effectiveCover();
    if (cover?.startsWith('data:')) {
      this.uploadService.upload(this.dataUrlToFile(cover, 'kapak.png'), 'Image').subscribe({
        next: (result) => this.postCourse(result.url, status, successMsg),
        error: (err) => {
          this.saving.set(false);
          this.notification.fromHttpError(err, 'Kapak görseli yüklenemedi.');
        },
      });
      return;
    }
    this.postCourse(cover, status, successMsg); // gradient veya kapaksız
  }

  // dataURL (base64) → File: upload API'sine gönderebilmek için
  private dataUrlToFile(dataUrl: string, name: string): File {
    const [head, b64] = dataUrl.split(',');
    const mime = head.match(/data:(.*?);/)?.[1] ?? 'image/png';
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new File([bytes], name, { type: mime });
  }

  private postCourse(coverUrl: string | null, status: CourseStatus, successMsg: string): void {
    const info = this.infoForm.getRawValue();

    this.courseService
      .create({
        title: info.title,
        description: info.description,
        coverImageUrl: coverUrl, // dosya yolu (/uploads/...) > renk gradient'i > null
        category: info.category,
        level: info.level,
        durationHours: Math.max(1, Math.round(this.totalDuration() / 60)),
        lessonCount: this.draftLessons().length,
        status,
        publishDate: status === 'Scheduled' ? this.publishDateIso() : null,
        isMandatory: this.isMandatory(),
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
      // Link harici URL, yükleme tipleri sunucudaki dosya yolunu (/uploads/...) taşır
      contentUrl: l.contentType !== 'Text' ? (l.contentUrl ?? null) : null,
      textContent: l.contentType === 'Text' ? (l.textContent ?? null) : null,
      notes: l.notes ?? null,
      weight: l.weight ?? 1,
    };
  }

  // Kurs + dersler başarıyla oluşturuldu: bildir ve role uygun listeye dön
  private finishCreate(msg: string): void {
    this.notification.success(msg);
    this.router.navigate([this.coursesLink()]);
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
