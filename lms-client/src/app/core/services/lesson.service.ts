import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../api.config';
import { CreateLesson, Lesson } from '../models/lesson.models';

// Dersler bir kursa bağlıdır: /api/courses/{courseId}/lessons
@Injectable({ providedIn: 'root' })
export class LessonService {
  private http = inject(HttpClient);

  private base(courseId: number): string {
    return `${API_URL}/courses/${courseId}/lessons`;
  }

  // Bir kursun dersleri (müfredat sırasıyla) — tüm giriş yapmış kullanıcılar
  getByCourse(courseId: number): Observable<Lesson[]> {
    return this.http.get<Lesson[]>(this.base(courseId));
  }

  // Ders ekle (yalnızca kursun sahibi Instructor veya Admin)
  create(courseId: number, dto: CreateLesson): Observable<Lesson> {
    return this.http.post<Lesson>(this.base(courseId), dto);
  }

  // Ders sil (yalnızca kursun sahibi Instructor veya Admin)
  remove(courseId: number, lessonId: number): Observable<void> {
    return this.http.delete<void>(`${this.base(courseId)}/${lessonId}`);
  }

  // Müfredat sırasını güncelle (istenen sıradaki ders id listesi)
  reorder(courseId: number, lessonIds: number[]): Observable<void> {
    return this.http.post<void>(`${this.base(courseId)}/reorder`, { lessonIds });
  }
}
