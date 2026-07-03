import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../api.config';
import { Course, CreateCourse, UpdateCourse } from '../models/course.models';
import { CourseAttendee } from '../models/enrollment.models';

@Injectable({ providedIn: 'root' })
export class CourseService {
  private http = inject(HttpClient);
  private base = `${API_URL}/courses`;

  // Aktif kurslar (tüm giriş yapmış kullanıcılar)
  getAll(): Observable<Course[]> {
    return this.http.get<Course[]>(this.base);
  }

  getById(id: number): Observable<Course> {
    return this.http.get<Course>(`${this.base}/${id}`);
  }

  // Instructor'ın kendi kursları
  getMyCourses(): Observable<Course[]> {
    return this.http.get<Course[]>(`${this.base}/my`);
  }

  create(course: CreateCourse): Observable<Course> {
    return this.http.post<Course>(this.base, course);
  }

  update(id: number, course: UpdateCourse): Observable<Course> {
    return this.http.put<Course>(`${this.base}/${id}`, course);
  }

  // Kalıcı silme (hard delete). Aktif/Pasif için update(...IsActive) kullanılır.
  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  // Bir kursa katılanlar (kursun sahibi Instructor veya Admin)
  getAttendees(courseId: number): Observable<CourseAttendee[]> {
    return this.http.get<CourseAttendee[]>(`${API_URL}/enrollments/course/${courseId}`);
  }
}
