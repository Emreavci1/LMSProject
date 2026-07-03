import { Component, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterLink } from '@angular/router';
import { MockLesson } from '../../../core/models/mock.models';
import { MockDataService } from '../../../core/services/mock-data.service';

// Öğrenci: Ders izleme ekranı (Udemy tarzı).
// Solda video alanı (şimdilik placeholder), sağda bölüm/ders listesi.
@Component({
  selector: 'app-player',
  imports: [
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatTabsModule,
    MatCheckboxModule,
    MatProgressBarModule,
  ],
  templateUrl: './player.html',
  styleUrl: './player.scss',
})
export class Player {
  readonly id = input.required<string>(); // route: /learn/:id

  protected mock = inject(MockDataService);

  readonly courseId = computed(() => Number(this.id()));
  readonly course = computed(() => this.mock.courses().find((c) => c.id === this.courseId()));
  readonly lessons = computed(() => this.mock.lessonsOf(this.courseId()));
  readonly activeLesson = signal<MockLesson | null>(null);

  // Dersleri bölümlere grupla: [{ section, lessons }]
  readonly sections = computed(() => {
    const groups: { section: string; lessons: MockLesson[] }[] = [];
    for (const lesson of this.lessons()) {
      const group = groups.find((g) => g.section === lesson.section);
      if (group) group.lessons.push(lesson);
      else groups.push({ section: lesson.section, lessons: [lesson] });
    }
    return groups;
  });

  readonly progress = computed(() => this.mock.progressOf(this.courseId()));

  constructor() {
    // İlk tamamlanmamış dersi (yoksa ilk dersi) aktif yap
    queueMicrotask(() => {
      const lessons = this.lessons();
      const firstIncomplete = lessons.find((l) => !this.mock.completedLessonIds().has(l.id));
      this.activeLesson.set(firstIncomplete ?? lessons[0] ?? null);
    });
  }

  selectLesson(lesson: MockLesson): void {
    this.activeLesson.set(lesson);
  }

  isCompleted(lessonId: number): boolean {
    return this.mock.completedLessonIds().has(lessonId);
  }

  toggleCompleted(lesson: MockLesson): void {
    this.mock.toggleLessonCompleted(lesson.id);
  }

  // Aktif dersi tamamla ve sıradakine geç
  completeAndNext(): void {
    const current = this.activeLesson();
    if (!current) return;

    if (!this.isCompleted(current.id)) {
      this.mock.toggleLessonCompleted(current.id);
    }

    const lessons = this.lessons();
    const index = lessons.findIndex((l) => l.id === current.id);
    if (index >= 0 && index < lessons.length - 1) {
      this.activeLesson.set(lessons[index + 1]);
    }
  }
}
