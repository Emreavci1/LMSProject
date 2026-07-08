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
import { CreateLesson, Lesson } from '../../../core/models/lesson.models';
import { CourseService } from '../../../core/services/course.service';
import { LessonService } from '../../../core/services/lesson.service';
import { NotificationService } from '../../../core/services/notification.service';
import { coverCss } from '../../../core/utils/cover.util';

export type ContentType = 'Video' | 'Document' | 'Text';

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
  private notification = inject(NotificationService);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);

  protected readonly coverCss = coverCss;

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
  readonly newContentType = signal<ContentType>('Video');
  readonly newContentUrl = signal('');
  readonly newTextContent = signal('');
  readonly newLessonNotes = signal('');

  readonly contentTypes: { value: ContentType, label: string }[] = [
    { value: 'Video', label: 'Video Bağlantısı' },
    { value: 'Document', label: 'Döküman (PDF / Sunum)' },
    { value: 'Text', label: 'Okuma Metni' }
  ];

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

    const dto: CreateLesson = {
      section,
      title,
      description: this.newLessonDescription().trim() || null,
      durationMin: this.newLessonDuration() || 15,
      contentType: type,
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
        this.showAddForm.set(false);
        this.notification.success('Ders eklendi.');
      },
      error: (err) => this.notification.fromHttpError(err, 'Ders eklenemedi.'),
    });
  }

  onMaterialFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.newContentUrl.set(`fake-url-for-${file.name}`);
      this.notification.success(`${file.name} başarıyla eklendi (Mock).`);
    }
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
