import { Component, OnInit, computed, effect, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { MockLesson } from '../../../core/models/mock.models';
import { CourseService } from '../../../core/services/course.service';
import { MockDataService } from '../../../core/services/mock-data.service';

// Oynatıcının ihtiyaç duyduğu kurs bilgisi — hem gerçek Course DTO'su
// hem MockCourse bu alanları karşılar.
interface PlayerCourse {
  title: string;
  description: string;
  lessonCount: number;
  durationHours: number;
  level?: string | null;
  instructorName: string;
}

// Öğrenci: Ders izleme ekranı (Udemy tarzı).
// Solda içerik alanı (video / okuma metni / döküman), sağda bölüm/ders listesi.
// İki rota kullanır: /learn/:id (gerçek kurs, API) ve /learn/demo/:id (demo kurs, mock).
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
  readonly id = input.required<string>(); // route: /learn/:id veya /learn/demo/:id
  readonly demo = input(false); // route data'dan bağlanır (withComponentInputBinding)

  protected mock = inject(MockDataService);
  private courseService = inject(CourseService);
  private sanitizer = inject(DomSanitizer);

  readonly courseId = computed(() => Number(this.id()));

  // Gerçek kurs API'den yüklenir; demo kurs mock'tan okunur
  private readonly realCourse = signal<PlayerCourse | null>(null);
  readonly loading = signal(true);

  readonly course = computed<PlayerCourse | null>(() =>
    this.demo()
      ? this.mock.courses().find((c) => c.id === this.courseId()) ?? null
      : this.realCourse()
  );

  // Dersler: demo kursta seed veriden, gerçek kursta managed depodan
  readonly lessons = computed<MockLesson[]>(() =>
    this.demo()
      ? this.mock.lessonsOf(this.courseId())
      : this.mock.managedLessonsOf(this.courseId())
  );

  readonly activeLesson = signal<MockLesson | null>(null);

  // Dersleri bölümlere grupla: [{ section, lessons }]
  readonly sections = computed(() => {
    const groups: { section: string; lessons: MockLesson[] }[] = [];
    for (const lesson of this.lessons()) {
      const group = groups.find((g) => g.section === lesson.section);
      if (group) group.lessons.push(lesson);
      else groups.push({ section: lesson.section, lessons: [lesson] });
    }
    return groups;
  });

  readonly progress = computed(() =>
    this.demo()
      ? this.mock.progressOf(this.courseId())
      : this.mock.managedProgressOf(this.courseId())
  );

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
    // Dersler hazır olunca ilk tamamlanmamış dersi (yoksa ilk dersi) aktif yap.
    // effect input'lar bağlandıktan sonra çalışır — constructor'da input okumak güvenli değil.
    effect(() => {
      const lessons = this.lessons();
      if (lessons.length > 0 && this.activeLesson() === null) {
        const firstIncomplete = lessons.find((l) => !this.mock.completedLessonIds().has(l.id));
        this.activeLesson.set(firstIncomplete ?? lessons[0]);
      }
    });
  }

  // Route input'ları (id, demo) ngOnInit'te hazırdır
  ngOnInit(): void {
    if (this.demo()) {
      this.loading.set(false);
      return;
    }

    // Gerçek kurs bilgisini API'den çek (başlık, açıklama vs. için)
    this.courseService.getById(this.courseId()).subscribe({
      next: (c) => {
        this.realCourse.set(c);
        this.loading.set(false);
      },
      error: () => this.loading.set(false), // course null kalır → "bulunamadı" ekranı
    });
  }

  selectLesson(lesson: MockLesson): void {
    this.activeLesson.set(lesson);
  }

  isCompleted(lessonId: number): boolean {
    return this.mock.completedLessonIds().has(lessonId);
  }

  toggleCompleted(lesson: MockLesson): void {
    this.mock.toggleLessonCompleted(lesson.id);
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

    if (!this.isCompleted(current.id)) {
      this.mock.toggleLessonCompleted(current.id);
    }
    this.goNext();
  }

  // İçerik tipine göre panel simgesi (ders listesi için)
  lessonIcon(lesson: MockLesson): string {
    switch (lesson.contentType) {
      case 'Video': return 'play_circle';
      case 'Document': return 'description';
      case 'Text': return 'menu_book';
      default: return 'play_circle';
    }
  }
}
