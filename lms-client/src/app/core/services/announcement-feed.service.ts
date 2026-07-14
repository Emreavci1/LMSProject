import { Injectable, computed, inject, signal } from '@angular/core';
import { CalendarEvent, timeLabel } from '../../shared/components/event-calendar/event-calendar';
import { Announcement } from '../models/announcement.models';
import { AnnouncementService } from './announcement.service';

// Giriş yapmış kullanıcının GÖREBİLECEĞİ duyuruların TEK kaynağı.
// Hem öğrenci hem eğitmen için çalışır (backend /my rol'e göre uygun listeyi döner:
// genel duyurular herkese, kurs duyuruları ilgili kişilere).
//
// Bir bildirim (push) sistemi olmadığı için duyurular bu servis üzerinden
// birçok yerde gösterilir: iki dashboard, eğitmen programı, öğrenci program sayfası
// ve takvim işaretleri. Böylece "duyuru mantığı" tek yerde toplanır.
@Injectable({ providedIn: 'root' })
export class AnnouncementFeedService {
  private announcementService = inject(AnnouncementService);

  // Kullanıcının gördüğü tüm duyurular (en yeni önce — backend sıralar)
  readonly announcements = signal<Announcement[]>([]);

  // Ana sayfa/dashboard kartları için en yeni 3 duyuru
  readonly latest = computed(() => this.announcements().slice(0, 3));

  // Duyuruların takvim olayları (tek kaynak): yayın günü + varsa son geçerlilik günü.
  // Hem öğrenci takvimi hem eğitmen programı bunu kullanır.
  readonly calendarEvents = computed<CalendarEvent[]>(() =>
    this.announcements().flatMap((a) => {
      const events: CalendarEvent[] = [
        {
          date: a.publishDate,
          label: `Duyuru (${timeLabel(a.publishDate)}): ${a.title}`,
          kind: 'announcement',
        },
      ];
      if (a.expiryDate) {
        events.push({
          date: a.expiryDate,
          label: `Duyuru bitiş (${timeLabel(a.expiryDate)}): ${a.title}`,
          kind: 'announcement',
        });
      }
      return events;
    })
  );

  private loaded = false;

  load(force = false): void {
    if (this.loaded && !force) return;
    this.loaded = true;
    this.announcementService.getMyAnnouncements().subscribe({
      next: (list) => this.announcements.set(list),
      error: () => { this.loaded = false; /* tekrar denenebilsin */ },
    });
  }

  // Oturum kapanınca temizlenir (sonraki kullanıcı öncekinin duyurularını görmesin)
  reset(): void {
    this.loaded = false;
    this.announcements.set([]);
  }
}
