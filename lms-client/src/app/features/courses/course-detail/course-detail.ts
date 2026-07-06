import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';
import { Course } from '../../../core/models/course.models';
import { CourseAttendee } from '../../../core/models/enrollment.models';
import { MockLesson } from '../../../core/models/mock.models';
import { AuthService } from '../../../core/services/auth.service';
import { CourseService } from '../../../core/services/course.service';
import { EnrollmentService } from '../../../core/services/enrollment.service';
import { MockDataService } from '../../../core/services/mock-data.service';
import { NotificationService } from '../../../core/services/notification.service';
import { coverCss } from '../../../core/utils/cover.util';

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
  private notification = inject(NotificationService);
  private router = inject(Router);
  private mock = inject(MockDataService);
  protected auth = inject(AuthService);

  readonly loading = signal(true);
  readonly course = signal<Course | null>(null);
  readonly isEnrolled = signal(false);
  readonly enrolling = signal(false);

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

  // Müfredat: dersler managed depodan (backend'de ders modülü yok — spec gereği)
  readonly lessons = computed<MockLesson[]>(() => {
    const c = this.course();
    return c ? this.mock.managedLessonsOf(c.id) : [];
  });

  // Dersleri bölümlere grupla
  readonly sections = computed(() => {
    const groups: { section: string; lessons: MockLesson[] }[] = [];
    for (const lesson of this.lessons()) {
      const group = groups.find((g) => g.section === lesson.section);
      if (group) group.lessons.push(lesson);
      else groups.push({ section: lesson.section, lessons: [lesson] });
    }
    return groups;
  });

  readonly totalMinutes = computed(() =>
    this.lessons().reduce((sum, l) => sum + (l.durationMin || 0), 0)
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
  lessonIcon(lesson: MockLesson): string {
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
}
