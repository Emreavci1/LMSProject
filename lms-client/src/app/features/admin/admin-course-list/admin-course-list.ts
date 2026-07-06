import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { RouterLink } from '@angular/router';
import { MockDataService } from '../../../core/services/mock-data.service';
import { NotificationService } from '../../../core/services/notification.service';

// Admin: Eğitim Yönetimi — tüm kursları tablo halinde listele, durum toggle, arama/filtre
@Component({
  selector: 'app-admin-course-list',
  imports: [FormsModule, RouterLink, MatIconModule, MatButtonModule, MatSlideToggleModule],
  templateUrl: './admin-course-list.html',
  styleUrl: './admin-course-list.scss',
})
export class AdminCourseList {
  protected mock = inject(MockDataService);
  private notification = inject(NotificationService);

  readonly searchTerm = signal('');
  readonly categoryFilter = signal<string | null>(null);
  readonly statusFilter = signal<'all' | 'active' | 'passive'>('all');

  readonly filteredCourses = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const category = this.categoryFilter();
    const status = this.statusFilter();

    return this.mock.courses().filter((c) => {
      if (status === 'active' && !c.isActive) return false;
      if (status === 'passive' && c.isActive) return false;
      if (category && c.category !== category) return false;
      if (term && !c.title.toLowerCase().includes(term) && !c.instructorName.toLowerCase().includes(term)) return false;
      return true;
    });
  });

  toggleStatus(courseId: number): void {
    this.mock.toggleCourseActive(courseId);
    this.notification.success('Kurs durumu güncellendi.');
  }
}
