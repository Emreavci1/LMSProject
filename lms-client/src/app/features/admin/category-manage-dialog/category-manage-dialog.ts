import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Course } from '../../../core/models/course.models';
import { MockDataService } from '../../../core/services/mock-data.service';
import { NotificationService } from '../../../core/services/notification.service';

// Dialog'a dışarıdan gelen veri: gerçek kurslar (kategori başına kurs sayısı için)
export interface CategoryManageData {
  courses: Course[];
}

// Admin: Kategori Yönetimi — Eğitimler sayfasından dialog olarak açılır
// (eski ayrı sayfanın yerine). Liste localStorage'da kalıcı tutulur;
// kurs oluşturma formundaki kategori dropdown'ı da bu listeyi kullanır.
@Component({
  selector: 'app-category-manage-dialog',
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './category-manage-dialog.html',
  styleUrl: './category-manage-dialog.scss',
})
export class CategoryManageDialog {
  protected mock = inject(MockDataService);
  private notification = inject(NotificationService);
  protected data = inject<CategoryManageData>(MAT_DIALOG_DATA);

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
    // Kursu olan kategori silinmesin: mevcut kursların etiketi boşta kalır
    if (this.courseCount(name) > 0) {
      this.notification.error('Bu kategoride eğitim var; önce eğitimleri başka kategoriye taşıyın.');
      return;
    }
    if (!confirm(`"${name}" kategorisi silinsin mi?`)) return;
    this.mock.removeCategory(name);
    this.notification.success('Kategori silindi.');
  }

  // Her kategoride kaç GERÇEK kurs var?
  courseCount(category: string): number {
    return this.data.courses.filter((c) => (c.category || 'Genel') === category).length;
  }
}
