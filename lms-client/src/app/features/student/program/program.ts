import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { AnnouncementService } from '../../../core/services/announcement.service';
import { Announcement } from '../../../core/models/announcement.models';
import { EventCalendar } from '../../../shared/components/event-calendar/event-calendar';
import { StudentCalendarService } from '../../../core/services/student-calendar.service';
import { MatIconModule } from '@angular/material/icon';
import { avatarSrc } from '../../../core/utils/avatar.util';
import { fileUrl } from '../../../core/utils/file-url.util';

@Component({
  selector: 'app-program',
  standalone: true,
  imports: [
    DatePipe,
    EventCalendar,
    MatIconModule
  ],
  templateUrl: './program.html',
  styleUrl: './program.scss'
})
export class ProgramComponent implements OnInit {
  private announcementService = inject(AnnouncementService);
  // Takvim olaylarının ortak kaynağı (ana sayfayla aynı)
  protected calendarService = inject(StudentCalendarService);
  protected readonly avatarSrc = avatarSrc;
  protected readonly fileUrl = fileUrl;

  announcements = signal<Announcement[]>([]);
  // Takvim artık ortak servisten: son tarihler + yayınlar + duyurular
  readonly calendarEvents = this.calendarService.events;

  ngOnInit(): void {
    // Takvim olaylarını ortak servisten yükle
    this.calendarService.load();

    // Duyuru akışı (sayfanın sol kısmı) için ayrıca listeyi çek
    this.announcementService.getMyAnnouncements().subscribe({
      next: (data) => this.announcements.set(data),
    });
  }
}
