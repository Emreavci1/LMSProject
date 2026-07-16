import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Course } from '../../../core/models/course.models';
import { Category } from '../../../core/models/category.models';
import { CategoryService } from '../../../core/services/category.service';
import { NotificationService } from '../../../core/services/notification.service';

// Dialog'a dışarıdan gelen veri: gerçek kurslar (kategori başına kurs sayısı için)
export interface CategoryManageData {
  courses: Course[];
}

// Admin: Kategori Yönetimi — Eğitimler sayfasından dialog olarak açılır.
// Liste backend'de (Categories tablosu) tutulur; kurs oluşturma formundaki
// kategori dropdown'ı da aynı API'yi kullanır.
@Component({
  selector: 'app-category-manage-dialog',
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './category-manage-dialog.html',
  styleUrl: './category-manage-dialog.scss',
})
export class CategoryManageDialog {
  private categoryService = inject(CategoryService);
  private notification = inject(NotificationService);
  protected data = inject<CategoryManageData>(MAT_DIALOG_DATA);

  readonly categories = signal<Category[]>([]);
  readonly newCategoryName = signal('');
  // Çift tıklamayı önlemek için (istek sürerken butonlar kilitli)
  readonly busy = signal(false);

  constructor() {
    this.loadCategories();
  }

  private loadCategories(): void {
    this.categoryService.getAll().subscribe({
      next: (list) => this.categories.set(list),
      error: () => this.notification.error('Kategoriler yüklenemedi.'),
    });
  }

  addCategory(): void {
    const name = this.newCategoryName().trim();
    if (!name) {
      this.notification.error('Kategori adı boş olamaz.');
      return;
    }
    if (this.categories().some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      this.notification.error('Bu kategori zaten mevcut.');
      return;
    }
    this.busy.set(true);
    this.categoryService.create(name).subscribe({
      next: (created) => {
        // Alfabetik sırayı koruyarak listeye ekle (backend de ada göre sıralıyor)
        this.categories.update((list) =>
          [...list, created].sort((a, b) => a.name.localeCompare(b.name, 'tr'))
        );
        this.newCategoryName.set('');
        this.busy.set(false);
        this.notification.success('Kategori eklendi.');
      },
      error: (err) => {
        this.busy.set(false);
        this.notification.error(err?.error?.message ?? 'Kategori eklenemedi.');
      },
    });
  }

  removeCategory(category: Category): void {
    // Kursu olan kategori silinmesin: mevcut kursların etiketi boşta kalır
    // (backend de aynı kuralı uygular — burası yalnızca hızlı geri bildirim)
    if (this.courseCount(category.name) > 0) {
      this.notification.error('Bu kategoride eğitim var; önce eğitimleri başka kategoriye taşıyın.');
      return;
    }
    if (!confirm(`"${category.name}" kategorisi silinsin mi?`)) return;

    this.busy.set(true);
    this.categoryService.delete(category.id).subscribe({
      next: () => {
        this.categories.update((list) => list.filter((c) => c.id !== category.id));
        this.busy.set(false);
        this.notification.success('Kategori silindi.');
      },
      error: (err) => {
        this.busy.set(false);
        this.notification.error(err?.error?.message ?? 'Kategori silinemedi.');
      },
    });
  }

  // Her kategoride kaç GERÇEK kurs var?
  courseCount(category: string): number {
    return this.data.courses.filter((c) => (c.category || 'Genel') === category).length;
  }
}
