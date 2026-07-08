import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';
import { Course } from '../../../core/models/course.models';
import { CourseAttendee } from '../../../core/models/enrollment.models';
import { Lesson } from '../../../core/models/lesson.models';
import { AuthService } from '../../../core/services/auth.service';
import { CourseService } from '../../../core/services/course.service';
import { EnrollmentService } from '../../../core/services/enrollment.service';
import { LessonService } from '../../../core/services/lesson.service';
import { NotificationService } from '../../../core/services/notification.service';
import { coverCss } from '../../../core/utils/cover.util';
import { formatCourseHours } from '../../../core/utils/duration.util';

// Kurs detay sayfası (Udemy tarzı): kapak hero + açıklama + müfredat.
// Katılımcı buradan kursa katılır; katıldıysa "Eğitime Git" ile oynatıcıya geçer.
@Component({
  selector: 'app-course-detail',
  imports: [
    RouterLink,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './course-detail.html',
  styleUrl: './course-detail.scss',
})
export class CourseDetail implements OnInit {
  // Route parametresi (withComponentInputBinding sayesinde otomatik bağlanır)
  readonly id = input.required<string>();

  private courseService = inject(CourseService);
  private enrollmentService = inject(EnrollmentService);
  private lessonService = inject(LessonService);
  private notification = inject(NotificationService);
  private router = inject(Router);
  protected auth = inject(AuthService);

  readonly loading = signal(true);
  readonly course = signal<Course | null>(null);
  readonly isEnrolled = signal(false);
  readonly enrolling = signal(false);
  readonly unenrolling = signal(false);

  // Sahibi/admin için katılımcı listesi
  readonly attendees = signal<CourseAttendee[]>([]);

  // Kapak CSS'i (görsel veya varsayılan gradient) — görsel yoksa hero arka planı için
  readonly cover = computed(() => coverCss(this.course()?.coverImageUrl));

  // Gerçek kapak görseli (dataURL/URL). Varsa <img> ile ORİJİNAL oranında gösterilir,
  // kırpılmaz; yoksa null döner ve gradient hero kullanılır.
  readonly coverImage = computed(() => {
    const url = this.course()?.coverImageUrl;
    if (!url || url.startsWith('linear-gradient') || url.startsWith('radial-gradient')) return null;
    return url;
  });

  // Müfredat: dersler backend API'den gelir (kurs yüklenince çekilir)
  readonly lessons = signal<Lesson[]>([]);

  // Dersleri bölümlere grupla
  readonly sections = computed(() => {
    const groups: { section: string; lessons: Lesson[] }[] = [];
    for (const lesson of this.lessons()) {
      const group = groups.find((g) => g.section === lesson.section);
      if (group) group.lessons.push(lesson);
      else groups.push({ section: lesson.section, lessons: [lesson] });
    }
    return groups;
  });

  // Kursun toplam takribi süresi: toplam dakika en yakın saate yuvarlanır (98 dk → "2 saat")
  readonly courseDurationLabel = computed(() =>
    formatCourseHours(this.course()?.durationMinutes ?? 0)
  );

  // Bu kullanıcı kursu düzenleyebilir mi? (sahibi Instructor veya Admin)
  // Not: UI ipucu; gerçek yetki kontrolü backend'de yapılır.
  readonly canManage = computed(() => {
    const c = this.course();
    if (!c) return false;
    return (
      this.auth.role() === 'Admin' ||
      (this.auth.role() === 'Instructor' &&
        c.instructorId === this.auth.currentUser()?.userId)
    );
  });

  readonly isAttendee = computed(() => this.auth.role() === 'CourseAttendee');

  // İçerik tipine göre ders simgesi
  lessonIcon(lesson: Lesson): string {
    switch (lesson.contentType) {
      case 'Video': return 'play_circle';
      case 'Document': return 'description';
      case 'Text': return 'menu_book';
      default: return 'play_circle';
    }
  }

  // DİKKAT: input() değerleri constructor'da henüz bağlanmamıştır —
  // burada this.id() okumak NG0950 hatası fırlatır (bembeyaz sayfa).
  // Route input'ları ngOnInit'te güvenle okunur.
  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    const courseId = Number(this.id());
    this.loading.set(true);

    this.courseService.getById(courseId).subscribe({
      next: (course) => {
        this.course.set(course);
        this.loading.set(false);
        this.loadRoleSpecificData(courseId);
        // Müfredatı (dersleri) API'den çek
        this.lessonService.getByCourse(courseId).subscribe({
          next: (list) => this.lessons.set(list),
          error: () => this.lessons.set([]),
        });
      },
      error: (err) => {
        this.loading.set(false);
        this.notification.fromHttpError(err, 'Kurs bulunamadı.');
        this.router.navigate(['/discover']);
      },
    });
  }

  private loadRoleSpecificData(courseId: number): void {
    // Katılımcı: bu kursa kayıtlı mı kontrol et
    if (this.isAttendee()) {
      this.enrollmentService.getMyEnrollments().subscribe({
        next: (enrollments) =>
          this.isEnrolled.set(enrollments.some((e) => e.courseId === courseId)),
      });
    }

    // Instructor/Admin: katılımcı listesini çek.
    // Sahibi değilse backend 403 döner; o durumda listeyi sessizce boş bırakırız.
    if (this.auth.role() === 'Instructor' || this.auth.role() === 'Admin') {
      this.courseService.getAttendees(courseId).subscribe({
        next: (attendees) => this.attendees.set(attendees),
        error: () => this.attendees.set([]),
      });
    }
  }

  enroll(): void {
    const c = this.course();
    if (!c) return;

    this.enrolling.set(true);
    this.enrollmentService.enroll(c.id).subscribe({
      next: () => {
        this.isEnrolled.set(true);
        this.enrolling.set(false);
        this.notification.success('Kursa başarıyla katıldınız.');
      },
      error: (err) => {
        this.enrolling.set(false);
        this.notification.fromHttpError(err, 'Kursa katılınamadı.');
      },
    });
  }

  unenroll(): void {
    const c = this.course();
    if (!c) return;
    if (!confirm(`"${c.title}" eğitiminden ayrılmak istediğine emin misin?`)) return;

    this.unenrolling.set(true);
    this.enrollmentService.unenroll(c.id).subscribe({
      next: () => {
        this.isEnrolled.set(false);
        this.unenrolling.set(false);
        this.notification.success('Eğitimden ayrıldın.');
      },
      error: (err) => {
        this.unenrolling.set(false);
        this.notification.fromHttpError(err, 'Eğitimden ayrılınamadı.');
      },
    });
  }
}
