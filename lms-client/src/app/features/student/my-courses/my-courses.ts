import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { MockDataService } from '../../../core/services/mock-data.service';

// Öğrenci: Eğitimlerim — kayıtlı olunan kursların listesi ve ilerleme durumu
@Component({
  selector: 'app-my-courses',
  imports: [MatIconModule, MatButtonModule, RouterLink],
  templateUrl: './my-courses.html',
  styleUrl: './my-courses.scss',
})
export class MyCourses {
  protected mock = inject(MockDataService);

  readonly completedCount = computed(
    () => this.mock.enrolledCourses().filter((c) => this.mock.progressOf(c.id) === 100).length
  );

  readonly totalHours = computed(() =>
    this.mock.enrolledCourses().reduce((sum, c) => sum + c.durationHours, 0)
  );
}
