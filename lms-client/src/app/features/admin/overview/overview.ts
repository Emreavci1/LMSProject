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
import { User } from '../../../core/models/user.models';
import { Announcement } from '../../../core/models/announcement.models';
import { CourseService } from '../../../core/services/course.service';
import { UserService } from '../../../core/services/user.service';
import { AnnouncementService } from '../../../core/services/announcement.service';

// Kurs + katılımcıları (aktivite/gecikme/takvim hesapları için)
interface CourseWithAttendees {
  course: Course;
  attendees: CourseAttendee[];
}

// Son aktivite satırı: katılım, gecikme uyarısı veya yeni eğitim açılışı
interface ActivityItem {
  text: string;
  date: string;
  overdue: boolean; // gecikme uyarıları kırmızı gösterilir
  isCourseOpen?: boolean; // eğitmenin açtığı yeni eğitim (mavi nokta)
}

// Admin: Genel Bakış — GERÇEK verilerle KPI'lar, takvim,
// en çok katılınan kategoriler ve son aktiviteler (gecikme uyarılı).
@Component({
  selector: 'app-overview',
  imports: [DatePipe, MatIconModule, MatProgressSpinnerModule, RouterLink, EventCalendar],
  templateUrl: './overview.html',
  styleUrl: './overview.scss',
})
export class Overview {
  private courseService = inject(CourseService);
  private userService = inject(UserService);
  private announcementService = inject(AnnouncementService);

  readonly loading = signal(true);
  readonly users = signal<User[]>([]);
  readonly data = signal<CourseWithAttendees[]>([]);
  // Tüm duyurular (admin hepsini görür) — takvimde yeşil işaret olarak gösterilir
  readonly announcements = signal<Announcement[]>([]);

  constructor() {
    // Duyuruları ayrıca çek (takvim işaretleri için); hata olsa da sayfa açılır
    this.announcementService.getManagedAnnouncements().subscribe({
      next: (list) => this.announcements.set(list),
      error: () => {
        /* takvim duyurusuz kalır */
      },
    });

    forkJoin({
      courses: this.courseService.getAllForAdmin(),
      users: this.userService.getAll(),
    }).subscribe({
      next: ({ courses, users }) => {
        this.users.set(users);
        if (courses.length === 0) {
          this.loading.set(false);
          return;
        }
        // Her kursun katılımcıları (gecikme + aktivite + takvim için)
        forkJoin(
          courses.map((course) =>
            this.courseService.getAttendees(course.id).pipe(
              map((attendees) => ({ course, attendees })),
              catchError(() => of({ course, attendees: [] as CourseAttendee[] }))
            )
          )
        ).subscribe({
          next: (list) => {
            this.data.set(list);
            this.loading.set(false);
          },
          error: () => this.loading.set(false),
        });
      },
      error: () => this.loading.set(false),
    });
  }

  // --- KPI'lar ---
  readonly totalUsers = computed(() => this.users().filter((u) => u.isActive).length);
  readonly activeCourses = computed(
    () => this.data().filter((d) => d.course.isActive && d.course.status === 'Published').length
  );
  readonly totalEnrollments = computed(() =>
    this.data().reduce((sum, d) => sum + d.attendees.length, 0)
  );
  // Geciken zorunlu eğitim sayısı (katılımcı bazında) — admin için kritik metrik
  readonly overdueCount = computed(() =>
    this.data().reduce((sum, d) => sum + d.attendees.filter((a) => a.isOverdue).length, 0)
  );

  // --- Takvim: zorunlu eğitim son tarihleri + zamanlanmış yayınlar ---
  readonly calendarEvents = computed<CalendarEvent[]>(() => {
    const events: CalendarEvent[] = [];

    for (const { course, attendees } of this.data()) {
      // Aynı kurs + aynı güne düşen son tarihleri grupla
      const byDay = new Map<string, { date: string; count: number }>();
      for (const a of attendees) {
        if (!a.isAssigned || !a.dueDate) continue;
        const key = new Date(a.dueDate).toDateString();
        const entry = byDay.get(key) ?? { date: a.dueDate, count: 0 };
        entry.count++;
        byDay.set(key, entry);
      }
      for (const { date, count } of byDay.values()) {
        events.push({
          date,
          label: `${course.title} — ${count} katılımcının son tarihi (${timeLabel(date)})`,
          kind: 'deadline',
        });
      }

      if (course.status === 'Scheduled' && course.publishDate) {
        events.push({
          date: course.publishDate,
          label: `Yayınlanacak (${timeLabel(course.publishDate)}): ${course.title}`,
          kind: 'publish',
        });
      }
    }

    // Duyuru olayları: yayın günü + varsa son geçerlilik günü (yeşil işaret)
    for (const a of this.announcements()) {
      events.push({
        date: a.publishDate,
        label: `Duyuru (${timeLabel(a.publishDate)}): ${a.title}`,
        kind: 'announcement',
      });
      if (a.expiryDate) {
        events.push({
          date: a.expiryDate,
          label: `Duyuru bitiş (${timeLabel(a.expiryDate)}): ${a.title}`,
          kind: 'announcement',
        });
      }
    }
    return events;
  });

  // --- En çok katılınan kategoriler (katılım sayısına göre ilk 4) ---
  readonly topCategories = computed(() => {
    const byCategory = new Map<string, number>();
    let total = 0;
    for (const { course, attendees } of this.data()) {
      const name = course.category || 'Genel';
      byCategory.set(name, (byCategory.get(name) ?? 0) + attendees.length);
      total += attendees.length;
    }
    return [...byCategory.entries()]
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name, count]) => ({
        name,
        count,
        percent: total === 0 ? 0 : Math.round((count / total) * 100),
      }));
  });

  // --- Son aktiviteler: gecikme uyarıları (önce) + eğitim açılışları + son katılımlar ---
  readonly activities = computed<ActivityItem[]>(() => {
    const overdues: ActivityItem[] = [];
    const normal: ActivityItem[] = [];

    for (const { course, attendees } of this.data()) {
      // Eğitmenin açtığı yeni eğitim (Admin'in açtıkları isOfficial=true, onları saymayız)
      if (!course.isOfficial) {
        normal.push({
          text: `${course.instructorName}, "${course.title}" eğitimini açtı`,
          date: course.createdDate,
          overdue: false,
          isCourseOpen: true,
        });
      }

      for (const a of attendees) {
        if (a.isOverdue) {
          overdues.push({
            text: `${a.fullName}, "${course.title}" zorunlu eğitimini süresinde tamamlamadı`,
            date: a.dueDate!,
            overdue: true,
          });
        }
        normal.push({
          text: `${a.fullName}, "${course.title}" eğitimine katıldı`,
          date: a.enrollDate,
          overdue: false,
        });
      }
    }

    overdues.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    // Katılımlar + eğitim açılışları tarihe göre birlikte sıralanır (yeniden eskiye)
    normal.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Gecikmeler her zaman en üstte; kalan yer en yeni katılım/açılışlarla dolar
    return [...overdues, ...normal].slice(0, 8);
  });
}
