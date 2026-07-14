import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import {
  CalendarEvent,
  EventCalendar,
  timeLabel,
} from '../../../shared/components/event-calendar/event-calendar';
import { Course } from '../../../core/models/course.models';
import { CourseAttendee } from '../../../core/models/enrollment.models';
import { CourseService } from '../../../core/services/course.service';
import { AnnouncementFeedService } from '../../../core/services/announcement-feed.service';
import { fileUrl } from '../../../core/utils/file-url.util';

// Bir kursta aynı güne denk gelen atama son tarihleri (gruplu)
interface DeadlineGroup {
  courseId: number;
  title: string;
  date: string;
  count: number; // o tarihte son tarihi olan katılımcı sayısı
}

// Eğitmen: Program — kendi eğitimlerinin yayın tarihleri ve
// kurslarındaki zorunlu eğitim (atama) son tarihleri; takvim + liste.
@Component({
  selector: 'app-schedule',
  imports: [DatePipe, MatIconModule, MatProgressSpinnerModule, RouterLink, EventCalendar],
  templateUrl: './schedule.html',
  styleUrl: './schedule.scss',
})
export class Schedule {
  private courseService = inject(CourseService);
  // Duyuruların ortak kaynağı (ana sayfa/öğrenci program ile aynı)
  protected feed = inject(AnnouncementFeedService);
  protected readonly fileUrl = fileUrl;

  readonly loading = signal(true);
  readonly myCourses = signal<Course[]>([]);
  readonly deadlineGroups = signal<DeadlineGroup[]>([]);

  constructor() {
    // Duyuruları yükle (takvimde ve "Son Duyurular" bölümünde görünür)
    this.feed.load();

    this.courseService.getMyCourses().subscribe({
      next: (courses) => {
        this.myCourses.set(courses);
        if (courses.length === 0) {
          this.loading.set(false);
          return;
        }

        // Her kursun katılımcılarını çek; atama son tarihlerini gün bazında grupla
        forkJoin(
          courses.map((course) =>
            this.courseService.getAttendees(course.id).pipe(
              map((attendees) => ({ course, attendees })),
              // Yetki yoksa/hata olursa kursu boş listeyle geç (sayfa yine açılır)
              catchError(() => of({ course, attendees: [] as CourseAttendee[] }))
            )
          )
        ).subscribe({
          next: (results) => {
            const groups: DeadlineGroup[] = [];
            for (const { course, attendees } of results) {
              const byDay = new Map<string, DeadlineGroup>();
              for (const attendee of attendees) {
                if (!attendee.isAssigned || !attendee.dueDate) continue;
                const key = new Date(attendee.dueDate).toDateString();
                const entry =
                  byDay.get(key) ??
                  { courseId: course.id, title: course.title, date: attendee.dueDate, count: 0 };
                entry.count++;
                byDay.set(key, entry);
              }
              groups.push(...byDay.values());
            }
            groups.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            this.deadlineGroups.set(groups);
            this.loading.set(false);
          },
          error: () => this.loading.set(false),
        });
      },
      error: () => this.loading.set(false),
    });
  }

  // Zamanlanmış (ileri tarihli) kendi eğitimleri
  readonly scheduledCourses = computed(() =>
    this.myCourses().filter((c) => c.status === 'Scheduled' && c.publishDate)
  );

  // Takvim olayları: yayın tarihleri (mavi) + atama son tarihleri (kırmızı) + duyurular (yeşil)
  readonly calendarEvents = computed<CalendarEvent[]>(() => [
    ...this.scheduledCourses().map((c) => ({
      date: c.publishDate!,
      label: `Yayınlanacak (${timeLabel(c.publishDate!)}): ${c.title}`,
      kind: 'publish' as const,
    })),
    ...this.deadlineGroups().map((g) => ({
      date: g.date,
      label: `${g.title} — ${g.count} katılımcının son tarihi (${timeLabel(g.date)})`,
      kind: 'deadline' as const,
    })),
    // Duyuru olayları (yayın + son geçerlilik) ortak feed servisinden
    ...this.feed.calendarEvents(),
  ]);

  // Liste: tüm olaylar tarihe göre (yakından uzağa); geçmiş olanlar işaretlenir
  readonly listItems = computed(() =>
    [
      ...this.scheduledCourses().map((c) => ({
        date: c.publishDate!,
        title: c.title,
        info: 'Eğitim yayınlanacak',
        kind: 'publish' as const,
        link: ['/instructor/courses', String(c.id)],
      })),
      ...this.deadlineGroups().map((g) => ({
        date: g.date,
        title: g.title,
        info: `${g.count} katılımcının zorunlu eğitim son tarihi`,
        kind: 'deadline' as const,
        link: ['/instructor/courses', String(g.courseId)],
      })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  );

  isPast(date: string): boolean {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999); // gün sonuna kadar "geçmiş" sayılmaz
    return d.getTime() < Date.now();
  }
}
