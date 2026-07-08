import { Component, OnInit, computed, effect, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { Course } from '../../../core/models/course.models';
import { Lesson } from '../../../core/models/lesson.models';
import { AuthService } from '../../../core/services/auth.service';
import { CourseService } from '../../../core/services/course.service';
import { LessonService } from '../../../core/services/lesson.service';
import { ProgressService } from '../../../core/services/progress.service';
import { formatCourseHours, sumLessonMinutes } from '../../../core/utils/duration.util';

// Öğrenci: Ders izleme ekranı (Udemy tarzı).
// Solda içerik alanı (video / okuma metni / döküman), sağda bölüm/ders listesi.
@Component({
  selector: 'app-player',
  imports: [
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatTabsModule,
    MatCheckboxModule,
    MatProgressBarModule,
  ],
  templateUrl: './player.html',
  styleUrl: './player.scss',
})
export class Player implements OnInit {
  readonly id = input.required<string>(); // route: /learn/:id

  private progressService = inject(ProgressService);
  private courseService = inject(CourseService);
  private lessonService = inject(LessonService);
  private sanitizer = inject(DomSanitizer);
  private auth = inject(AuthService);

  readonly courseId = computed(() => Number(this.id()));

  // Eğitmen/Admin "Önizle" ile geldiyse geri dönüş kendi eğitim listesine gider
  readonly isPreview = computed(
    () => this.auth.role() === 'Instructor' || this.auth.role() === 'Admin'
  );
  readonly backLink = computed(() =>
    this.isPreview() ? '/instructor/courses' : '/my-courses'
  );

  readonly course = signal<Course | null>(null);
  readonly loading = signal(true);

  // Dersler (ngOnInit'te API'den doldurulur)
  readonly lessons = signal<Lesson[]>([]);

  readonly activeLesson = signal<Lesson | null>(null);

  // Dersleri bölümlere grupla: [{ section, lessons }]
  readonly sections = computed(() => {
    const groups: { section: string; lessons: Lesson[] }[] = [];
    for (const lesson of this.lessons()) {
      const group = groups.find((g) => g.section === lesson.section);
      if (group) group.lessons.push(lesson);
      else groups.push({ section: lesson.section, lessons: [lesson] });
    }
    return groups;
  });

  // İlerleme: tamamlanan ders / toplam ders (tamamlananlar backend'de)
  readonly progress = computed(() => {
    const lessons = this.lessons();
    if (lessons.length === 0) return 0;
    const done = lessons.filter((l) =>
      this.progressService.completedLessonIds().has(l.id)
    ).length;
    return Math.round((done / lessons.length) * 100);
  });

  // Kursun toplam takribi süresi: toplam dakika en yakın saate yuvarlanır (98 dk → "2 saat")
  readonly courseDurationLabel = computed(() => formatCourseHours(sumLessonMinutes(this.lessons())));

  // Aktif dersin listedeki sırası — önceki/sonraki butonları için
  readonly activeIndex = computed(() => {
    const current = this.activeLesson();
    return current ? this.lessons().findIndex((l) => l.id === current.id) : -1;
  });
  readonly hasPrev = computed(() => this.activeIndex() > 0);
  readonly hasNext = computed(
    () => this.activeIndex() >= 0 && this.activeIndex() < this.lessons().length - 1
  );

  // Aktif ders video ise gömülebilir YouTube URL'i (değilse null)
  readonly videoUrl = computed<SafeResourceUrl | null>(() => {
    const lesson = this.activeLesson();
    if (!lesson || lesson.contentType !== 'Video' || !lesson.contentUrl) return null;
    const match = lesson.contentUrl.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/
    );
    if (!match) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.youtube.com/embed/${match[1]}`
    );
  });

  constructor() {
    // Tamamlanan dersleri backend'den çek (ilerleme çubuğu ve işaretler için)
    this.progressService.load();

    // Dersler hazır olunca ilk tamamlanmamış dersi (yoksa ilk dersi) aktif yap.
    // effect input'lar bağlandıktan sonra çalışır — constructor'da input okumak güvenli değil.
    effect(() => {
      const lessons = this.lessons();
      if (lessons.length > 0 && this.activeLesson() === null) {
        const firstIncomplete = lessons.find(
          (l) => !this.progressService.completedLessonIds().has(l.id)
        );
        this.activeLesson.set(firstIncomplete ?? lessons[0]);
      }
    });
  }

  // Route input'ı (id) ngOnInit'te hazırdır
  ngOnInit(): void {
    const courseId = this.courseId();

    this.courseService.getById(courseId).subscribe({
      next: (c) => {
        this.course.set(c);
        this.loading.set(false);
      },
      error: () => this.loading.set(false), // course null kalır → "bulunamadı" ekranı
    });
    this.lessonService.getByCourse(courseId).subscribe({
      next: (list) => this.lessons.set(list),
      error: () => this.lessons.set([]),
    });
  }

  selectLesson(lesson: Lesson): void {
    this.activeLesson.set(lesson);
  }

  isCompleted(lessonId: number): boolean {
    return this.progressService.isCompleted(lessonId);
  }

  toggleCompleted(lesson: Lesson): void {
    // Önizleme (eğitmen/admin): ilerleme kaydedilmez, backend zaten reddeder
    if (this.isPreview()) return;
    this.progressService.toggle(lesson.id);
  }

  goPrev(): void {
    if (this.hasPrev()) this.activeLesson.set(this.lessons()[this.activeIndex() - 1]);
  }

  goNext(): void {
    if (this.hasNext()) this.activeLesson.set(this.lessons()[this.activeIndex() + 1]);
  }

  // Aktif dersi tamamla ve sıradakine geç
  completeAndNext(): void {
    const current = this.activeLesson();
    if (!current) return;

    // Önizlemede yalnızca gezinilir, tamamlama kaydedilmez
    if (!this.isPreview() && !this.isCompleted(current.id)) {
      this.progressService.toggle(current.id);
    }
    this.goNext();
  }

  // İçerik tipine göre panel simgesi (ders listesi için)
  lessonIcon(lesson: Lesson): string {
    switch (lesson.contentType) {
      case 'Video': return 'play_circle';
      case 'Document': return 'description';
      case 'Text': return 'menu_book';
      default: return 'play_circle';
    }
  }
}
