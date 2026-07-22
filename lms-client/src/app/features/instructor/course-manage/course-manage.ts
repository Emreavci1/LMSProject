import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import {
  AssignAttendeeDialog,
  AssignAttendeeData,
} from '../../admin/assign-attendee-dialog/assign-attendee-dialog';
import { Course, UpdateCourse } from '../../../core/models/course.models';
import { CourseAttendee } from '../../../core/models/enrollment.models';
import { CreateLesson, Lesson, LessonContentType } from '../../../core/models/lesson.models';
import { AuthService } from '../../../core/services/auth.service';
import { CourseService } from '../../../core/services/course.service';
import { EnrollmentService } from '../../../core/services/enrollment.service';
import { LessonService } from '../../../core/services/lesson.service';
import { NotificationService } from '../../../core/services/notification.service';
import { UploadService } from '../../../core/services/upload.service';
import { avatarSrc } from '../../../core/utils/avatar.util';
import { coverCss } from '../../../core/utils/cover.util';
import { fileUrl, isUploadedFile } from '../../../core/utils/file-url.util';
import { FileDropDirective } from '../../../shared/directives/file-drop.directive';
import { ExamEditor } from '../exam-editor/exam-editor';

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
    FileDropDirective,
    ExamEditor,
  ],
  templateUrl: './course-manage.html',
  styleUrl: './course-manage.scss',
})
export class CourseManage {
  readonly id = input.required<string>();
  // Sorgu parametresi (?tab=exams) — sihirbazdan "sınav ekle" ile gelince
  // doğrudan Sınavlar sekmesi açılır. withComponentInputBinding sayesinde bağlanır.
  readonly tab = input<string>('');

  // Sekme sırası: İçerik(0) · Sınavlar(1) · Öğrenciler(2) · Ayarlar(3)
  readonly initialTabIndex = computed(() => (this.tab() === 'exams' ? 1 : 0));

  private courseService = inject(CourseService);
  private lessonService = inject(LessonService);
  private uploadService = inject(UploadService);
  private enrollmentService = inject(EnrollmentService);
  private auth = inject(AuthService);
  private notification = inject(NotificationService);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);
  private dialog = inject(MatDialog);

  // Atama işlemleri yalnızca Admin'e açık (backend de ayrıca doğrular)
  readonly isAdminUser = computed(() => this.auth.role() === 'Admin');

  // Geri dönüş hedefi: Admin buraya Eğitim Yönetimi'nden gelir, eğitmen kendi listesinden
  readonly backLink = computed(() =>
    this.isAdminUser() ? '/admin/courses' : '/instructor/courses'
  );
  readonly backLabel = computed(() =>
    this.isAdminUser() ? 'Eğitim Yönetimi' : 'Eğitimlerim'
  );

  protected readonly coverCss = coverCss;
  protected readonly avatarSrc = avatarSrc;
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
    this.loadAttendees(courseId);
  });

  private loadAttendees(courseId: number): void {
    this.courseService.getAttendees(courseId).subscribe({
      next: (list) => this.attendees.set(list),
      error: () => this.attendees.set([]),
    });
  }

  // Öğrenciler sekmesine (index 2) her geçişte katılımcıları tazele —
  // Sınavlar sekmesinde yapılan değerlendirme sonuçları rozetlere yansısın.
  onTabChange(index: number): void {
    if (index === 2) this.loadAttendees(Number(this.id()));
  }

  // --- Kurs başlığı düzenleme + görünürlük (Özel / Herkese Açık) ---
  readonly editingCourseTitle = signal(false);
  readonly courseTitleDraft = signal('');
  // Kurs güncelleme sürerken butonları kilitle (çift tık / eşzamanlı istek olmasın)
  readonly savingCourse = signal(false);

  startEditCourseTitle(): void {
    const c = this.course();
    if (!c) return;
    this.courseTitleDraft.set(c.title);
    this.editingCourseTitle.set(true);
  }

  cancelEditCourseTitle(): void {
    this.editingCourseTitle.set(false);
  }

  saveCourseTitle(): void {
    const title = this.courseTitleDraft().trim();
    if (!title) {
      this.notification.error('Başlık boş olamaz.');
      return;
    }
    this.patchCourse({ title }, 'Başlık güncellendi.', () => this.editingCourseTitle.set(false));
  }

  // Görünürlüğü değiştir: Özel (isMandatory=true) ⇄ Herkese Açık (false)
  toggleVisibility(): void {
    const c = this.course();
    if (!c || this.savingCourse()) return;
    const next = !c.isMandatory;
    this.patchCourse(
      { isMandatory: next },
      next ? 'Eğitim artık özel: yalnızca atanan katılımcılar görür.' : 'Eğitim herkese açık yapıldı.'
    );
  }

  // Kursu güncelle: mevcut tüm alanları koru, yalnızca verilen alanları değiştir
  // (backend PUT tüm alanları ister). publish() ile aynı desen, tek yerde.
  private patchCourse(changes: Partial<UpdateCourse>, successMsg: string, onSuccess?: () => void): void {
    const c = this.course();
    if (!c) return;
    this.savingCourse.set(true);
    const dto: UpdateCourse = {
      title: c.title,
      description: c.description,
      coverImageUrl: c.coverImageUrl,
      category: c.category,
      level: c.level,
      durationHours: c.durationHours,
      lessonCount: c.lessonCount,
      status: c.status,
      publishDate: c.publishDate,
      isActive: c.isActive,
      isMandatory: c.isMandatory,
      ...changes,
    };
    this.courseService.update(c.id, dto).subscribe({
      next: (updated) => {
        this.course.set(updated);
        this.savingCourse.set(false);
        onSuccess?.();
        this.notification.success(successMsg);
      },
      error: (err) => {
        this.savingCourse.set(false);
        this.notification.fromHttpError(err, 'Güncelleme başarısız oldu.');
      },
    });
  }

  // --- Ders başlığı düzenleme (satır içi) ---
  readonly editingLessonId = signal<number | null>(null);
  readonly lessonTitleDraft = signal('');
  readonly savingLesson = signal(false);

  startEditLesson(lesson: Lesson): void {
    this.previewLessonId.set(null); // önizleme açıksa kapat, düzenlemeyle çakışmasın
    this.editingLessonId.set(lesson.id);
    this.lessonTitleDraft.set(lesson.title);
  }

  cancelEditLesson(): void {
    this.editingLessonId.set(null);
  }

  saveLessonTitle(lesson: Lesson): void {
    const title = this.lessonTitleDraft().trim();
    if (!title) {
      this.notification.error('Ders başlığı boş olamaz.');
      return;
    }
    // Değişiklik yoksa boşuna istek atma
    if (title === lesson.title) {
      this.editingLessonId.set(null);
      return;
    }
    this.savingLesson.set(true);
    this.lessonService.update(Number(this.id()), lesson.id, { title }).subscribe({
      next: (updated) => {
        this.lessons.update((list) => list.map((l) => (l.id === updated.id ? updated : l)));
        this.editingLessonId.set(null);
        this.savingLesson.set(false);
        this.notification.success('Ders başlığı güncellendi.');
      },
      error: (err) => {
        this.savingLesson.set(false);
        this.notification.fromHttpError(err, 'Ders güncellenemedi.');
      },
    });
  }

  // --- Zorunlu eğitim atamaları (yalnızca Admin) ---

  openAssignDialog(): void {
    const c = this.course();
    if (!c) return;

    const data: AssignAttendeeData = {
      courseId: c.id,
      courseTitle: c.title,
      excludedUserIds: this.attendees().map((a) => a.userId),
    };
    this.dialog
      .open(AssignAttendeeDialog, { data })
      .afterClosed()
      .subscribe((assigned) => {
        if (assigned) this.loadAttendees(c.id); // yeni atanan listede görünsün
      });
  }

  unassign(attendee: CourseAttendee): void {
    if (!confirm(`${attendee.fullName} adlı katılımcının atamasını kaldırmak istiyor musun?`)) return;
    this.enrollmentService.unassign(Number(this.id()), attendee.userId).subscribe({
      next: () => {
        this.attendees.update((list) => list.filter((a) => a.userId !== attendee.userId));
        this.notification.success('Atama kaldırıldı.');
      },
      error: (err) => this.notification.fromHttpError(err, 'Atama kaldırılamadı.'),
    });
  }

  // "Yeni Ders Ekle" formu aç/kapat
  readonly showAddForm = signal(false);

  // Yeni ders ekleme form state'i
  readonly newLessonTitle = signal('');
  readonly newLessonDescription = signal('');
  readonly newLessonSection = signal('');
  readonly newLessonDuration = signal<number>(15);
  // Ders yükü (kredi): 1 varsayılan; 2/3 ilerlemeye daha çok etki eder
  readonly newLessonWeight = signal<number>(1);
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
    if (file) this.uploadLessonFile(file);
    input.value = ''; // aynı dosya tekrar seçilebilsin
  }

  // Dosya seçici VE sürükle-bırak (appFileDrop) buradan yükler
  uploadLessonFile(file: File): void {
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
      weight: this.newLessonWeight(),
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
        this.newLessonWeight.set(1);
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
        this.router.navigate([this.backLink()]);
      },
      error: () => this.notification.error('Silme işlemi başarısız oldu.'),
    });
  }
}
