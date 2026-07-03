import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { MockDataService } from '../../../core/services/mock-data.service';
import { NotificationService } from '../../../core/services/notification.service';

// Öğrenci: Eğitimleri Keşfet — arama, kategori ve seviye filtreli kurs kataloğu
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
  private notification = inject(NotificationService);

  readonly searchTerm = signal('');
  readonly selectedCategory = signal<string | null>(null);
  readonly selectedLevel = signal<string | null>(null);

  readonly levels = ['Başlangıç', 'Orta', 'İleri'];

  readonly filteredCourses = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const category = this.selectedCategory();
    const level = this.selectedLevel();

    return this.mock.courses().filter((c) => {
      if (!c.isActive) return false;
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

  enroll(courseId: number): void {
    this.mock.enroll(courseId);
    this.notification.success('Kursa katıldınız! "Eğitimlerim" sayfasından erişebilirsiniz.');
  }
}
