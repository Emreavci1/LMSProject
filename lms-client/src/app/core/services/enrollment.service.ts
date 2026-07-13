import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../api.config';
import { AssignEnrollment, Enrollment } from '../models/enrollment.models';

@Injectable({ providedIn: 'root' })
export class EnrollmentService {
  private http = inject(HttpClient);
  private base = `${API_URL}/enrollments`;

  // Kursa katıl (CourseAttendee)
  enroll(courseId: number): Observable<Enrollment> {
    return this.http.post<Enrollment>(this.base, { courseId });
  }

  // Kullanıcının katıldığı kurslar
  getMyEnrollments(): Observable<Enrollment[]> {
    return this.http.get<Enrollment[]>(`${this.base}/my`);
  }

  // Kayıtlı kurstan ayrıl
  unenroll(courseId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${courseId}`);
  }

  // Zorunlu eğitime katılımcı ata (yalnızca Admin)
  assign(dto: AssignEnrollment): Observable<Enrollment> {
    return this.http.post<Enrollment>(`${this.base}/assign`, dto);
  }

  // Atamayı kaldır (yalnızca Admin)
  unassign(courseId: number, userId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/assign/${courseId}/${userId}`);
  }
}
