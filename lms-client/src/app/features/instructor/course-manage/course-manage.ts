import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { Course } from '../../../core/models/course.models';
import { CourseAttendee } from '../../../core/models/enrollment.models';
import { CreateLesson, Lesson, LessonContentType } from '../../../core/models/lesson.models';
import { CourseService } from '../../../core/services/course.service';
import { LessonService } from '../../../core/services/lesson.service';
import { NotificationService } from '../../../core/services/notification.service';
import { UploadService } from '../../../core/services/upload.service';
import { coverCss } from '../../../core/utils/cover.util';
import { fileUrl, isUploadedFile } from '../../../core/utils/file-url.util';

export type ContentType = LessonContentType;

// Eğitmen: Eğitim Detayı — kurs, dersler ve katılımcılar API'den yüklenir
@Component({
  selector: 'app-course-manage',
  imports: [
    RouterLink,
    FormsModule,
    DatePipe,
    MatTabsModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './course-manage.html',
  styleUrl: './course-manage.scss',
})
export class CourseManage {
  readonly id = input.required<string>();

  private courseService = inject(CourseService);
  private lessonService = inject(LessonService);
  private uploadService = inject(UploadService);
  private notification = inject(NotificationService);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);

  protected readonly coverCss = coverCss;
  // Göreli /uploads yolunu tam adrese çevirir; isUploadedFile = harici link mi dosya mı ayrımı
  protected readonly fileUrl = fileUrl;
  protected readonly isUploadedFile = isUploadedFile;

  readonly course = signal<Course | null>(null);
  readonly loading = signal(true);
  readonly notFound = signal(false);

  // id değişince kursu API'den yükle
  private readonly _load = effect(() => {
    const courseId = Number(this.id());
    this.loading.set(true);
    this.notFound.set(false);
    this.courseService.getById(courseId).subscribe({
      next: (c) => {
        this.course.set(c);
        this.loading.set(false);
      },
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
      },
    });
  });

  // Dersler artık backend'de (SQL Server). id değişince API'den yüklenir.
  readonly lessons = signal<Lesson[]>([]);

  private readonly _loadLessons = effect(() => {
    const courseId = Number(this.id());
    this.lessonService.getByCourse(courseId).subscribe({
      next: (list) => this.lessons.set(list),
      error: () => this.lessons.set([]),
    });
  });

  // Katılımcılar (gerçek kayıtlar + ilerleme yüzdeleri) — id değişince API'den yüklenir
  readonly attendees = signal<CourseAttendee[]>([]);

  private readonly _loadAttendees = effect(() => {
    const courseId = Number(this.id());
    this.courseService.getAttendees(courseId).subscribe({
      next: (list) => this.attendees.set(list),
      error: () => this.attendees.set([]),
    });
  });

  // "Yeni Ders Ekle" formu aç/kapat
  readonly showAddForm = signal(false);

  // Yeni ders ekleme form state'i
  readonly newLessonTitle = signal('');
  readonly newLessonDescription = signal('');
  readonly newLessonSection = signal('');
  readonly newLessonDuration = signal<number>(15);
  readonly newContentType = signal<ContentType>('Link');
  readonly newContentUrl = signal('');
  readonly newTextContent = signal('');
  readonly newLessonNotes = signal('');
  // Dosya yükleme durumu (Image/Document/Video tipleri için)
  readonly uploadingFile = signal(false);
  readonly newUploadedFileName = signal('');

  // İçerik tipi değişince önceki tipe ait içerik alanlarını sıfırla
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

  // 5 içerik tipi. Link ve Text bugün tam çalışır;
  // Image/Document/Video dosya yükleme ile çalışacak (depolama altyapısı yakında).
  readonly contentTypes: { value: ContentType, label: string }[] = [
    { value: 'Link', label: 'URL Bağlantısı' },
    { value: 'Image', label: 'Fotoğraf Yükle' },
    { value: 'Text', label: 'Okuma Metni' },
    { value: 'Document', label: 'Sunum / PDF Yükle' },
    { value: 'Video', label: 'Video Yükle' }
  ];

  // Tip başına gösterim etiketi/ikonu (template'de iç içe ternary yerine)
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

  // Ortalama tamamlama: katılımcıların ilerleme yüzdelerinin ortalaması
  readonly completionRate = computed(() => {
    const attendees = this.attendees();
    if (attendees.length === 0) return 0;
    return Math.round(attendees.reduce((sum, a) => sum + a.progress, 0) / attendees.length);
  });

  addLesson(): void {
    const title = this.newLessonTitle().trim();
    const section = this.newLessonSection().trim() || 'Genel';
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
    // Yükleme tipleri dosya ister (upload çalışıyor; ders sonradan düzenlenemiyor)
    if ((type === 'Image' || type === 'Document' || type === 'Video') && !this.newContentUrl()) {
      this.notification.error('Önce dosyayı yüklemelisiniz.');
      return;
    }
    if (this.uploadingFile()) {
      this.notification.error('Dosya yüklemesi sürüyor, lütfen bekleyin.');
      return;
    }

    const dto: CreateLesson = {
      section,
      title,
      description: this.newLessonDescription().trim() || null,
      durationMin: this.newLessonDuration() || 15,
      contentType: type,
      // Link harici URL, yükleme tipleri sunucudaki dosya yolunu (/uploads/...) taşır
      contentUrl: type !== 'Text' ? this.newContentUrl().trim() : null,
      textContent: type === 'Text' ? this.newTextContent().trim() : null,
      notes: this.newLessonNotes().trim() || null,
    };

    this.lessonService.create(Number(this.id()), dto).subscribe({
      next: (created) => {
        // Dönen dersi listenin sonuna ekle (backend sona ekler)
        this.lessons.update((list) => [...list, created]);
        // Formu sıfırla
        this.newLessonTitle.set('');
        this.newLessonDescription.set('');
        this.newContentUrl.set('');
        this.newTextContent.set('');
        this.newLessonNotes.set('');
        this.newUploadedFileName.set('');
        this.showAddForm.set(false);
        this.notification.success('Ders eklendi.');
      },
      error: (err) => this.notification.fromHttpError(err, 'Ders eklenemedi.'),
    });
  }

  removeLesson(lessonId: number): void {
    if (this.previewLessonId() === lessonId) this.previewLessonId.set(null);
    this.lessonService.remove(Number(this.id()), lessonId).subscribe({
      next: () => {
        this.lessons.update((list) => list.filter((l) => l.id !== lessonId));
        this.notification.success('Ders kaldırıldı.');
      },
      error: (err) => this.notification.fromHttpError(err, 'Ders silinemedi.'),
    });
  }

  // --- Ders içerik önizlemesi ---
  readonly previewLessonId = signal<number | null>(null);

  togglePreview(lessonId: number): void {
    this.previewLessonId.set(this.previewLessonId() === lessonId ? null : lessonId);
  }

  // Video linkini gömülebilir (YouTube embed) URL'e çevir; değilse null
  videoEmbedUrl(url: string | null | undefined): SafeResourceUrl | null {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
    if (!match) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.youtube.com/embed/${match[1]}`
    );
  }

  moveLesson(lessonId: number, direction: -1 | 1): void {
    const list = this.lessons();
    const index = list.findIndex((l) => l.id === lessonId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= list.length) return;

    const reordered = [...list];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

    // Optimistik güncelle, sonra API'ye yeni sırayı bildir; hata olursa geri al
    this.lessons.set(reordered);
    this.lessonService.reorder(Number(this.id()), reordered.map((l) => l.id)).subscribe({
      error: () => {
        this.notification.error('Sıralama güncellenemedi.');
        this.lessons.set(list);
      },
    });
  }

  // Kursu yayına al (taslak/zamanlanmış → yayında)
  publish(): void {
    const c = this.course();
    if (!c) return;
    this.courseService
      .update(c.id, {
        title: c.title,
        description: c.description,
        coverImageUrl: c.coverImageUrl,
        category: c.category,
        level: c.level,
        durationHours: c.durationHours,
        lessonCount: c.lessonCount,
        status: 'Published',
        publishDate: null,
      })
      .subscribe({
        next: (updated) => {
          this.course.set(updated);
          this.notification.success('Eğitim yayınlandı.');
        },
        error: () => this.notification.error('Yayınlama başarısız oldu.'),
      });
  }

  // Kursu sil (soft delete / pasifleştir)
  deleteCourse(): void {
    const c = this.course();
    if (!c) return;
    if (!confirm(`"${c.title}" eğitimini kalıcı olarak silmek istediğine emin misin?`)) return;
    this.courseService.remove(c.id).subscribe({
      next: () => {
        this.notification.success('Eğitim silindi.');
        this.router.navigate(['/instructor/courses']);
      },
      error: () => this.notification.error('Silme işlemi başarısız oldu.'),
    });
  }
}
