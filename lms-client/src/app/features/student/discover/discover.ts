import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CourseService } from '../../../core/services/course.service';
import { EnrollmentService } from '../../../core/services/enrollment.service';
import { MockDataService } from '../../../core/services/mock-data.service';
import { NotificationService } from '../../../core/services/notification.service';
import { coverCss } from '../../../core/utils/cover.util';

// Katalog kartı: gerçek (API) ve demo (mock) kursları tek tipte birleştirir.
// `key` alanı zorunlu çünkü demo id'leri (1,2,3) ile veritabanı id'leri çakışabilir.
interface CatalogCourse {
  key: string; // 'real-5' | 'demo-1'
  id: number;
  isReal: boolean;
  title: string;
  description: string;
  category: string;
  level: string;
  durationHours: number;
  lessonCount: number;
  instructorName: string;
  cover: string; // CSS background değeri (gradient veya url(...))
}

// Öğrenci: Eğitimleri Keşfet — arama, kategori ve seviye filtreli kurs kataloğu.
// Eğitmenlerin yayınladığı GERÇEK kurslar API'den gelir; yanlarında 3 demo kurs gösterilir.
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
  protected mock = inject(MockDataService);
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
            key: `real-${c.id}`,
            id: c.id,
            isReal: true,
            title: c.title,
            description: c.description,
            category: c.category || 'Genel',
            level: c.level || 'Başlangıç',
            durationHours: c.durationHours,
            lessonCount: c.lessonCount,
            instructorName: c.instructorName,
            cover: coverCss(c.coverImageUrl),
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

  // Demo kursları da aynı kart tipine çevir
  private readonly demoCourses = computed<CatalogCourse[]>(() =>
    this.mock.courses().filter((c) => c.isActive).map((c) => ({
      key: `demo-${c.id}`,
      id: c.id,
      isReal: false,
      title: c.title,
      description: c.description,
      category: c.category,
      level: c.level,
      durationHours: c.durationHours,
      lessonCount: c.lessonCount,
      instructorName: c.instructorName,
      cover: c.cover,
    }))
  );

  // Gerçek kurslar önce (en yeni en üstte), demo kurslar sonra
  private readonly allCourses = computed<CatalogCourse[]>(() => [
    ...this.realCourses(),
    ...this.demoCourses(),
  ]);

  // Kategori hapları: tanımlı kategoriler + gerçek kurslardan gelenler (tekrarsız)
  readonly categories = computed(() => {
    const set = new Set(this.mock.categories());
    this.realCourses().forEach((c) => set.add(c.category));
    return [...set];
  });

  readonly filteredCourses = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const category = this.selectedCategory();
    const level = this.selectedLevel();

    return this.allCourses().filter((c) => {
      if (category && c.category !== category) return false;
      if (level && c.level !== level) return false;
      if (term && !c.title.toLowerCase().includes(term) && !c.instructorName.toLowerCase().includes(term)) return false;
      return true;
    });
  });

  toggleCategory(category: string): void {
    this.selectedCategory.set(this.selectedCategory() === category ? null : category);
  }

  toggleLevel(level: string): void {
    this.selectedLevel.set(this.selectedLevel() === level ? null : level);
  }

  isEnrolled(course: CatalogCourse): boolean {
    return course.isReal
      ? this.enrolledRealIds().has(course.id)
      : this.mock.isEnrolled(course.id);
  }

  enroll(course: CatalogCourse): void {
    if (this.isEnrolled(course)) return;

    if (!course.isReal) {
      // Demo kurs: oturum içi sahte katılım
      this.mock.enroll(course.id);
      this.notification.success('Kursa katıldınız! "Eğitimlerim" sayfasından erişebilirsiniz.');
      return;
    }

    // Gerçek kurs: backend'e kayıt (aynı kursa ikinci kayıt backend'de engellenir)
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
