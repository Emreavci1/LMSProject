import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Announcement, CreateAnnouncement, UpdateAnnouncement } from '../models/announcement.models';
import { API_URL } from '../api.config';

@Injectable({
  providedIn: 'root'
})
export class AnnouncementService {
  private http = inject(HttpClient);
  private apiUrl = `${API_URL}/announcements`;

  getMyAnnouncements(): Observable<Announcement[]> {
    return this.http.get<Announcement[]>(`${this.apiUrl}/my`);
  }

  getCourseAnnouncements(courseId: number): Observable<Announcement[]> {
    return this.http.get<Announcement[]>(`${this.apiUrl}/course/${courseId}`);
  }

  getManagedAnnouncements(): Observable<Announcement[]> {
    return this.http.get<Announcement[]>(`${this.apiUrl}/managed`);
  }

  create(data: CreateAnnouncement): Observable<Announcement> {
    return this.http.post<Announcement>(this.apiUrl, data);
  }

  update(id: number, data: UpdateAnnouncement): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
