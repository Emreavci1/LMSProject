import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MockDataService } from '../../../core/services/mock-data.service';

// Admin: Genel Bakış — analitik dashboard
// KPI kartları, kayıt trendi, popüler kategoriler, son aktiviteler, popüler kurslar tablosu
@Component({
  selector: 'app-overview',
  imports: [MatIconModule],
  templateUrl: './overview.html',
  styleUrl: './overview.scss',
})
export class Overview {
  protected mock = inject(MockDataService);

  // KPI verileri (mock; backend genişleyince servisten çekilecek)
  readonly kpis = [
    { icon: 'group', label: 'Toplam Kullanıcı', value: '1,450', trend: -2, trendUp: false },
    { icon: 'school', label: 'Aktif Eğitimler', value: '48', trend: 12, trendUp: true },
    { icon: 'task_alt', label: 'Tamamlanan Dersler', value: '12,340', trend: 5, trendUp: true },
    { icon: 'insights', label: 'Aylık Aktif Öğrenci', value: '890', trend: 8, trendUp: true },
  ];

  // Popüler kategoriler (mock)
  readonly popularCategories = [
    { name: 'Sağlık & İletişim', percent: 45 },
    { name: 'Teknoloji & Yazılım', percent: 30 },
    { name: 'Kişisel Gelişim', percent: 25 },
  ];

  // Popüler kurslar tablosu (mock.courses'dan türetilmiş)
  readonly topCourses = this.mock.courses()
    .filter((c) => c.isActive)
    .sort((a, b) => b.students - a.students)
    .slice(0, 4);

  // Aylık bar chart max değeri (saf CSS bar genişlikleri için)
  readonly maxEnrollment = Math.max(...this.mock.monthlyEnrollments().map((m) => m.count));
}
