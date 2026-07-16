import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CourseService } from '../../../core/services/course.service';
import { EnrollmentService } from '../../../core/services/enrollment.service';
import { NotificationService } from '../../../core/services/notification.service';
import { coverCss } from '../../../core/utils/cover.util';
import { formatCourseHours } from '../../../core/utils/duration.util';

interface CatalogCourse {
  id: number;
  title: string;
  description: string;
  category: string;
  level: string;
  durationLabel: string; // "1 saat 30 dk" gibi (30 dk yuvarlı toplam)
  lessonCount: number;
  instructorName: string;
  cover: string; // CSS background değeri (gradient veya url(...))
  // Kurum eğitimi (Admin açtı) — kartta öne çıkan rozetle gösterilir
  isOfficial: boolean;
}

// Öğrenci: Eğitimleri Keşfet — arama, kategori ve seviye filtreli kurs kataloğu.
// Eğitmenlerin yayınladığı GERÇEK kurslar API'den gelir.
@Component({
  selector: 'app-discover',
  imports: [
    FormsModule,
    RouterLink,
    MatIconModule,
  ],
  templateUrl: './discover.html',
  styleUrl: './discover.scss',
})
export class Discover {
  private auth = inject(AuthService);
  private courseService = inject(CourseService);
  private enrollmentService = inject(EnrollmentService);
  private notification = inject(NotificationService);

  readonly searchTerm = signal('');
  readonly selectedCategory = signal<string | null>(null);
  readonly selectedLevel = signal<string | null>(null);

  readonly levels = ['Başlangıç', 'Orta', 'İleri'];

  // Yalnızca katılımcı (öğrenci) kursa katılabilir — buton buna göre gösterilir
  readonly isStudent = computed(() => this.auth.currentUser()?.role === 'CourseAttendee');

  // --- Gerçek kurslar (backend) ---
  readonly realCourses = signal<CatalogCourse[]>([]);
  // Gerçek kurslara yapılan katılımların courseId'leri ("Katıldın" durumu için)
  readonly enrolledRealIds = signal<Set<number>>(new Set());
  readonly loading = signal(true);

  constructor() {
    // Backend zaten yalnızca yayınlanmış (Published) kursları döner
    this.courseService.getAll().subscribe({
      next: (courses) => {
        this.realCourses.set(
          courses.map((c) => ({
            id: c.id,
            title: c.title,
            description: c.description,
            category: c.category || 'Genel',
            level: c.level || 'Başlangıç',
            durationLabel: formatCourseHours(c.durationMinutes),
            lessonCount: c.lessonCount,
            instructorName: c.instructorName,
            cover: coverCss(c.coverImageUrl),
            isOfficial: c.isOfficial,
          }))
        );
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notification.error('Eğitimler yüklenemedi. Lütfen sayfayı yenileyin.');
      },
    });

    // Katılınan kursları çek (yalnızca öğrenci rolünde anlamlı)
    if (this.isStudent()) {
      this.enrollmentService.getMyEnrollments().subscribe({
        next: (list) => this.enrolledRealIds.set(new Set(list.map((e) => e.courseId))),
        error: () => { /* katalog yine de gösterilir */ },
      });
    }
  }

  // Kategori hapları: yayındaki kursların kategorilerinden (tekrarsız).
  // Boş kategoride kurs olmayacağı için ayrı kategori listesi çekmeye gerek yok.
  readonly categories = computed(() => {
    const set = new Set<string>();
    this.realCourses().forEach((c) => set.add(c.category || 'Genel'));
    return [...set];
  });

  readonly filteredCourses = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const category = this.selectedCategory();
    const level = this.selectedLevel();

    return this.realCourses()
      .filter((c) => {
        if (category && c.category !== category) return false;
        if (level && c.level !== level) return false;
        if (term && !c.title.toLowerCase().includes(term) && !c.instructorName.toLowerCase().includes(term)) return false;
        return true;
      })
      // Kurum eğitimleri (Admin açtı) katalogda her zaman en önde
      .sort((a, b) => Number(b.isOfficial) - Number(a.isOfficial));
  });

  toggleCategory(category: string): void {
    this.selectedCategory.set(this.selectedCategory() === category ? null : category);
  }

  toggleLevel(level: string): void {
    this.selectedLevel.set(this.selectedLevel() === level ? null : level);
  }

  isEnrolled(course: CatalogCourse): boolean {
    return this.enrolledRealIds().has(course.id);
  }

  enroll(course: CatalogCourse): void {
    if (this.isEnrolled(course)) return;

    this.enrollmentService.enroll(course.id).subscribe({
      next: () => {
        this.enrolledRealIds.update((set) => new Set(set).add(course.id));
        this.notification.success('Kursa katıldınız! "Eğitimlerim" sayfasından erişebilirsiniz.');
      },
      error: (err) => {
        const msg = err?.error?.message ?? 'Kursa katılırken bir hata oluştu.';
        this.notification.error(msg);
      },
    });
  }
}
