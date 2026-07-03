import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MockDataService } from '../../../core/services/mock-data.service';
import { NotificationService } from '../../../core/services/notification.service';

// Admin: Kategori Yönetimi — kategorileri listele, ekle, sil
@Component({
  selector: 'app-categories',
  imports: [FormsModule, MatIconModule, MatButtonModule],
  templateUrl: './categories.html',
  styleUrl: './categories.scss',
})
export class Categories {
  protected mock = inject(MockDataService);
  private notification = inject(NotificationService);

  readonly newCategoryName = signal('');

  addCategory(): void {
    const name = this.newCategoryName().trim();
    if (!name) {
      this.notification.error('Kategori adı boş olamaz.');
      return;
    }
    if (this.mock.categories().includes(name)) {
      this.notification.error('Bu kategori zaten mevcut.');
      return;
    }
    this.mock.addCategory(name);
    this.newCategoryName.set('');
    this.notification.success('Kategori eklendi.');
  }

  removeCategory(name: string): void {
    if (!confirm(`"${name}" kategorisi silinsin mi?`)) return;
    this.mock.removeCategory(name);
    this.notification.success('Kategori silindi.');
  }

  // Her kategoride kaç kurs var?
  courseCount(category: string): number {
    return this.mock.courses().filter((c) => c.category === category).length;
  }
}
