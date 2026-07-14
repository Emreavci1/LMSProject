import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { AssignmentReport } from '../../../core/models/enrollment.models';
import { EnrollmentService } from '../../../core/services/enrollment.service';
import { avatarSrc } from '../../../core/utils/avatar.util';

// Durum filtresi seçenekleri
type StatusFilter = 'all' | 'overdue' | 'inprogress' | 'completed';

// Admin: Zorunlu Eğitim Raporu — TÜM atamalar tek tabloda.
// Kim hangi zorunlu eğitimi tamamladı/tamamlamadı/geciktirdi, tek bakışta.
@Component({
  selector: 'app-assignment-report',
  imports: [DatePipe, MatIconModule, MatProgressSpinnerModule, RouterLink],
  templateUrl: './assignment-report.html',
  styleUrl: './assignment-report.scss',
})
export class AssignmentReportPage {
  private enrollmentService = inject(EnrollmentService);
  protected readonly avatarSrc = avatarSrc;

  readonly loading = signal(true);
  readonly rows = signal<AssignmentReport[]>([]);

  // Filtreler
  readonly search = signal('');
  readonly statusFilter = signal<StatusFilter>('all');

  constructor() {
    this.enrollmentService.getAssignmentReport().subscribe({
      next: (rows) => {
        this.rows.set(rows);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  // Satırın durumu: gecikti > tamamladı > devam ediyor
  statusOf(row: AssignmentReport): StatusFilter {
    if (row.isOverdue) return 'overdue';
    if (row.progress === 100) return 'completed';
    return 'inprogress';
  }

  statusLabel(row: AssignmentReport): string {
    switch (this.statusOf(row)) {
      case 'overdue': return 'Gecikti';
      case 'completed': return 'Tamamladı';
      default: return 'Devam Ediyor';
    }
  }

  // --- Özet sayılar (filtre butonlarının üstündeki rozetlerde) ---
  readonly overdueCount = computed(() => this.rows().filter((r) => r.isOverdue).length);
  readonly completedCount = computed(
    () => this.rows().filter((r) => !r.isOverdue && r.progress === 100).length
  );
  readonly inProgressCount = computed(
    () => this.rows().length - this.overdueCount() - this.completedCount()
  );

  // --- Filtrelenmiş satırlar (arama: isim/e-posta/eğitim adı) ---
  readonly filteredRows = computed(() => {
    const term = this.search().trim().toLowerCase();
    const status = this.statusFilter();
    return this.rows().filter((r) => {
      if (status !== 'all' && this.statusOf(r) !== status) return false;
      if (!term) return true;
      return (
        r.fullName.toLowerCase().includes(term) ||
        r.email.toLowerCase().includes(term) ||
        r.courseTitle.toLowerCase().includes(term)
      );
    });
  });

  // --- Sayfalama: kurs başına 40-50 katılımcıda satır sayısı yüzleri bulur,
  // tablo hep 25 satırla sınırlı kalır ---
  private readonly PAGE_SIZE = 25;
  readonly page = signal(1);

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredRows().length / this.PAGE_SIZE))
  );

  readonly pagedRows = computed(() => {
    const start = (this.page() - 1) * this.PAGE_SIZE;
    return this.filteredRows().slice(start, start + this.PAGE_SIZE);
  });

  // "1–25 / 132" gösterimi
  readonly rangeLabel = computed(() => {
    const total = this.filteredRows().length;
    if (total === 0) return '0 / 0';
    const start = (this.page() - 1) * this.PAGE_SIZE + 1;
    const end = Math.min(this.page() * this.PAGE_SIZE, total);
    return `${start}–${end} / ${total}`;
  });

  prevPage(): void {
    this.page.update((p) => Math.max(1, p - 1));
  }

  nextPage(): void {
    this.page.update((p) => Math.min(this.totalPages(), p + 1));
  }

  setStatus(status: StatusFilter): void {
    this.statusFilter.set(status);
    this.page.set(1); // filtre değişince ilk sayfaya dön
  }

  onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
    this.page.set(1);
  }
}
