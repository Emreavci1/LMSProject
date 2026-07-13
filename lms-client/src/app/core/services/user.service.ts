import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../api.config';
import { Course } from '../models/course.models';
import { UserEnrollment } from '../models/enrollment.models';
import { CreateUser, UpdateUser, User } from '../models/user.models';

// Kullanıcı yönetimi — yalnızca Admin (backend zaten [Authorize(Roles="Admin")])
@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  private base = `${API_URL}/users`;

  getAll(): Observable<User[]> {
    return this.http.get<User[]>(this.base);
  }

  create(user: CreateUser): Observable<User> {
    return this.http.post<User>(this.base, user);
  }

  update(id: number, user: UpdateUser): Observable<User> {
    return this.http.put<User>(`${this.base}/${id}`, user);
  }

  deactivate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  // Kullanıcı detayı: katıldığı kurslar + ilerlemeleri
  getEnrollments(id: number): Observable<UserEnrollment[]> {
    return this.http.get<UserEnrollment[]>(`${this.base}/${id}/enrollments`);
  }

  // Kullanıcı detayı: (eğitmen/admin) açtığı kurslar
  getCourses(id: number): Observable<Course[]> {
    return this.http.get<Course[]>(`${this.base}/${id}/courses`);
  }
}
