import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, effect, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { Course } from '../../../core/models/course.models';
import { Lesson } from '../../../core/models/lesson.models';
import { ExamListItem } from '../../../core/models/exam.models';
import { Announcement } from '../../../core/models/announcement.models';
import { AnnouncementService } from '../../../core/services/announcement.service';
import { AuthService } from '../../../core/services/auth.service';
import { CourseService } from '../../../core/services/course.service';
import { EnrollmentService } from '../../../core/services/enrollment.service';
import { ExamService } from '../../../core/services/exam.service';
import { LessonService } from '../../../core/services/lesson.service';
import { ProgressService } from '../../../core/services/progress.service';
import { formatCourseHours, sumLessonMinutes } from '../../../core/utils/duration.util';
import { fileUrl, isUploadedFile } from '../../../core/utils/file-url.util';

// Öğrenci: Ders izleme ekranı (Udemy tarzı).
// Solda içerik alanı (video / okuma metni / döküman), sağda bölüm/ders listesi.
@Component({
  selector: 'app-player',
  imports: [
    RouterLink,
    DatePipe,
    MatIconModule,
    MatButtonModule,
    MatTabsModule,
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
  private examService = inject(ExamService);
  private enrollmentService = inject(EnrollmentService);
  private announcementService = inject(AnnouncementService);
  private sanitizer = inject(DomSanitizer);
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly courseId = computed(() => Number(this.id()));

  // Duyuru ek dosyası bağlantısı için (template'te kullanılır)
  protected readonly fileUrl = fileUrl;

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

  // Kursun sınavları (eğitim sonu). Tüm dersler bitince açılır.
  readonly exams = signal<ExamListItem[]>([]);

  readonly activeLesson = signal<Lesson | null>(null);

  // Bu kurs kayıt olarak KULLANICIYA ATANMIŞ mı (zorunlu)?
  // Admin'in zorunlu işaretlediği kurslar VE public bir kursa tek tek atama —
  // ikisi de enrollment.isAssigned = true olur. Video izleme zorunluluğu buna bağlı.
  readonly assigned = signal(false);

  // Bu oturumda videosu sonuna kadar izlenen ders id'leri (zorunlu video kilidi için)
  readonly watchedVideoIds = signal<Set<number>>(new Set());

  // Bu kursa özel duyurular ("Duyurular" sekmesinde gösterilir)
  readonly announcements = signal<Announcement[]>([]);

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

  // Tüm dersler tamamlandı mı? (sınavların kilidi buna bağlı — backend ile aynı kural)
  readonly allLessonsDone = computed(() => {
    const lessons = this.lessons();
    if (lessons.length === 0) return true;
    const done = this.progressService.completedLessonIds();
    return lessons.every((l) => done.has(l.id));
  });

  // İlerleme: DERS YÜKÜ (kredi) ağırlıklı + SINAVLAR (her biri 1 birim) —
  // (tamamlanan ders yükü + gönderilen sınav) / (toplam ders yükü + toplam sınav) — backend ile aynı
  readonly progress = computed(() => {
    const lessons = this.lessons();
    const exams = this.exams();
    const totalWeight = lessons.reduce((sum, l) => sum + (l.weight || 1), 0) + exams.length;
    if (totalWeight === 0) return 0;
    const doneLessons = lessons
      .filter((l) => this.progressService.completedLessonIds().has(l.id))
      .reduce((sum, l) => sum + (l.weight || 1), 0);
    const doneExams = exams.filter((e) => this.progressService.isExamSubmitted(e.id)).length;
    return Math.round(((doneLessons + doneExams) / totalWeight) * 100);
  });

  // Bir sınav bu öğrenci tarafından gönderildi mi? (panel işareti için)
  examSubmitted(examId: number): boolean {
    return this.progressService.isExamSubmitted(examId);
  }

  // Sınava git (yalnızca tüm dersler bitince). Önizlemede kilit yok ama gönderim de yok.
  openExam(exam: ExamListItem): void {
    if (!this.allLessonsDone()) return;
    this.router.navigate(['/learn', this.courseId(), 'exam', exam.id]);
  }

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

  // Aktif ders URL taşıyorsa (Link, veya URL ile kaydedilmiş eski Video dersleri)
  // gömülebilir YouTube URL'i (değilse null)
  readonly videoUrl = computed<SafeResourceUrl | null>(() => {
    const lesson = this.activeLesson();
    if (!lesson || !lesson.contentUrl) return null;
    if (lesson.contentType !== 'Video' && lesson.contentType !== 'Link') return null;
    const match = lesson.contentUrl.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/
    );
    if (!match) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.youtube.com/embed/${match[1]}`
    );
  });

  // --- Sunucuya yüklenmiş dosyalar (/uploads/...) ---

  // Video dersi yüklenmiş dosyaysa <video> etiketiyle oynatılacak tam adres
  readonly uploadedVideoUrl = computed<string | null>(() => {
    const lesson = this.activeLesson();
    if (!lesson || lesson.contentType !== 'Video') return null;
    return isUploadedFile(lesson.contentUrl) ? fileUrl(lesson.contentUrl) : null;
  });

  // Fotoğraf dersinin görsel adresi
  readonly imageUrl = computed<string | null>(() => {
    const lesson = this.activeLesson();
    if (!lesson || lesson.contentType !== 'Image' || !lesson.contentUrl) return null;
    return fileUrl(lesson.contentUrl);
  });

  // Döküman dersinin dosya adresi ("Aç/İndir" butonu için)
  readonly documentHref = computed<string | null>(() => {
    const lesson = this.activeLesson();
    if (!lesson || lesson.contentType !== 'Document' || !lesson.contentUrl) return null;
    return fileUrl(lesson.contentUrl);
  });

  // PDF ise sayfada gömülü gösterilir (iframe src'i güvenlik onayı ister)
  readonly pdfUrl = computed<SafeResourceUrl | null>(() => {
    const href = this.documentHref();
    if (!href || !href.toLowerCase().endsWith('.pdf')) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(href);
  });

  // --- Zorunlu video izleme kilidi ---
  // Aktif ders, tamamlanmadan önce videosunun sonuna kadar izlenmesi GEREKEN bir ders mi?
  // Koşullar: atanmış (zorunlu) kurs + yüklenmiş video dersi (bitişi <video> ile algılanabilir)
  // + öğrenci görünümü (önizlemede kilit yok) + henüz tamamlanmamış.
  readonly mustWatchActive = computed(() => {
    const lesson = this.activeLesson();
    if (!lesson) return false;
    if (this.isPreview()) return false;
    if (!this.assigned()) return false;
    if (lesson.contentType !== 'Video') return false;
    if (this.uploadedVideoUrl() === null) return false; // yalnızca yerel <video> (YouTube'un bitişi algılanamaz)
    if (this.isCompleted(lesson.id)) return false;
    return true;
  });

  // Aktif dersin videosu bu oturumda sonuna kadar izlendi mi?
  readonly activeVideoWatched = computed(() => {
    const lesson = this.activeLesson();
    return lesson ? this.watchedVideoIds().has(lesson.id) : false;
  });

  // "Tamamla" butonu kilitli mi? (izlenmesi gerekiyor ama daha bitmedi)
  readonly completeLocked = computed(() => this.mustWatchActive() && !this.activeVideoWatched());

  constructor() {
    // Tamamlanan dersleri + gönderilen sınavları backend'den çek (ilerleme çubuğu/işaretler)
    this.progressService.load();
    this.progressService.loadExams();

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

    // Kursun sınavları (eğitim sonu) — içerik panelinde derslerden sonra gösterilir
    this.examService.getByCourse(courseId).subscribe({
      next: (list) => this.exams.set(list),
      error: () => this.exams.set([]),
    });

    // Kursa özel duyurular (yayınlanmış + süresi geçmemiş olanlar backend'den gelir)
    this.announcementService.getCourseAnnouncements(courseId).subscribe({
      next: (list) => this.announcements.set(list),
      error: () => this.announcements.set([]), // sekme "duyuru yok" gösterir
    });

    // Öğrenci görünümünde bu kursa ait kaydın atanmış (zorunlu) olup olmadığını çek
    if (!this.isPreview()) {
      this.enrollmentService.getMyEnrollments().subscribe({
        next: (list) => {
          const enrollment = list.find((e) => e.courseId === courseId);
          this.assigned.set(enrollment?.isAssigned ?? false);
        },
        error: () => this.assigned.set(false),
      });
    }
  }

  selectLesson(lesson: Lesson): void {
    this.activeLesson.set(lesson);
  }

  // <video> sonuna gelince: aktif dersi "izlendi" olarak işaretle → kilit açılır
  onVideoEnded(): void {
    const lesson = this.activeLesson();
    if (lesson) this.watchedVideoIds.update((s) => new Set(s).add(lesson.id));
  }

  isCompleted(lessonId: number): boolean {
    return this.progressService.isCompleted(lessonId);
  }

  // Kurs tamamlama tebrik ekranı (son ders tamamlanınca açılır)
  readonly showCongrats = signal(false);

  goPrev(): void {
    if (this.hasPrev()) this.activeLesson.set(this.lessons()[this.activeIndex() - 1]);
  }

  goNext(): void {
    if (this.hasNext()) this.activeLesson.set(this.lessons()[this.activeIndex() + 1]);
  }

  // Aktif dersi tamamla ve sıradakine geç.
  // Bu, dersleri tamamlamanın TEK yolu — listedeki işaretler salt göstergedir.
  completeAndNext(): void {
    const current = this.activeLesson();
    if (!current) return;

    // Zorunlu video henüz sonuna kadar izlenmedi: tamamlamaya izin verme
    if (this.completeLocked()) return;

    // Önizlemede yalnızca gezinilir, tamamlama kaydedilmez
    if (!this.isPreview() && !this.isCompleted(current.id)) {
      this.progressService.toggle(current.id);

      // Kurs bitti mi? Tüm dersler + tüm sınavlar tamam olmalı.
      // Sınav varsa ve gönderilmemişse tebrik yerine öğrenci sınav(lar)a yönlendirilir.
      const allLessonsDone = this.lessons().every(
        (l) => l.id === current.id || this.isCompleted(l.id)
      );
      const allExamsDone = this.exams().every((e) => this.examSubmitted(e.id));
      if (allLessonsDone && allExamsDone) {
        this.showCongrats.set(true);
        return;
      }
    }
    this.goNext();
  }

  // İçerik tipine göre panel simgesi (ders listesi için)
  lessonIcon(lesson: Lesson): string {
    switch (lesson.contentType) {
      case 'Video': return 'play_circle';
      case 'Document': return 'description';
      case 'Text': return 'menu_book';
      case 'Link': return 'link';
      case 'Image': return 'image';
      default: return 'play_circle';
    }
  }
}
