import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, forkJoin, of } from 'rxjs';
import { CalendarEvent, timeLabel } from '../../shared/components/event-calendar/event-calendar';
import { AnnouncementFeedService } from './announcement-feed.service';
import { CourseService } from './course.service';
import { EnrollmentService } from './enrollment.service';

// Öğrencinin takvim olaylarının TEK kaynağı.
// Hem ana sayfa (dashboard) hem "Program ve Duyurular" sayfası buradan beslenir;
// böylece iki takvim her zaman aynı olayları gösterir.
//
// İçerik:
//  - Zorunlu eğitim son tarihleri (KULLANICIYA ÖZEL — yalnızca ona atanmışlar)  → kırmızı
//  - Zamanlanmış eğitim yayınları (yaklaşan yayın tarihleri)                     → mavi
//  - Duyurular (ortak AnnouncementFeedService'ten — tek kaynak)                  → yeşil
@Injectable({ providedIn: 'root' })
export class StudentCalendarService {
  private enrollmentService = inject(EnrollmentService);
  private courseService = inject(CourseService);
  private feed = inject(AnnouncementFeedService);

  // Son tarih + yayın olayları (kullanıcıya özel; enrollment/kurs verisinden)
  private readonly deadlineEvents = signal<CalendarEvent[]>([]);
  private readonly publishEvents = signal<CalendarEvent[]>([]);

  // Takvim olayları: son tarihler + yayınlar + duyurular (duyuru olayları tek kaynaktan:
  // yayın + son geçerlilik günü ortak feed servisince üretilir)
  readonly events = computed<CalendarEvent[]>(() => [
    ...this.deadlineEvents(),
    ...this.publishEvents(),
    ...this.feed.calendarEvents(),
  ]);

  private loaded = false;

  // İlk çağrıda verileri çeker; tekrar çağrılırsa yeniden çekmez (force ile zorlanabilir).
  load(force = false): void {
    // Duyurular ortak servisten (kendisi de önbelleklidir)
    this.feed.load(force);

    if (this.loaded && !force) return;
    this.loaded = true;

    forkJoin({
      enrollments: this.enrollmentService.getMyEnrollments().pipe(catchError(() => of([]))),
      upcoming: this.courseService.getUpcoming().pipe(catchError(() => of([]))),
    }).subscribe(({ enrollments, upcoming }) => {
      // Kullanıcıya özel: zorunlu eğitim son tarihleri
      this.deadlineEvents.set(
        enrollments
          .filter((e) => e.isAssigned && e.dueDate)
          .map((e) => ({
            date: e.dueDate!,
            label: `Zorunlu eğitim son tarihi (${timeLabel(e.dueDate!)}): ${e.courseTitle}`,
            kind: 'deadline' as const,
          }))
      );

      // Zamanlanmış eğitim yayınları
      this.publishEvents.set(
        upcoming
          .filter((c) => c.publishDate)
          .map((c) => ({
            date: c.publishDate!,
            label: `Yayına girecek eğitim (${timeLabel(c.publishDate!)}): ${c.title}`,
            kind: 'publish' as const,
          }))
      );
    });
  }

  // Oturum kapanınca çağrılır: kendi önbelleğini ve duyuru feed'ini temizler.
  reset(): void {
    this.loaded = false;
    this.deadlineEvents.set([]);
    this.publishEvents.set([]);
    this.feed.reset();
  }
}
