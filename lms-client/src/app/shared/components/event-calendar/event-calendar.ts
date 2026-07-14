import { DatePipe } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { MatCalendar, MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';

// Tooltip metinlerinde saat göstermek için ortak yardımcı (örn. "17:30")
export function timeLabel(date: string): string {
  return new Date(date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

// Takvimde gösterilecek tek bir olay
export interface CalendarEvent {
  date: string; // ISO tarih (gün hassasiyetinde işaretlenir)
  label: string; // hover'da (tooltip) gösterilecek açıklama
  kind: 'deadline' | 'publish' | 'announcement'; // kırmızı: son tarih, mavi: yayın tarihi, yeşil: duyuru
}

// Olay işaretli mini takvim: mat-calendar'ı sarar, günleri renklendirir,
// üzerine gelince tooltip gösterir ve işaretli bir güne TIKLAYINCA o günün
// olaylarını kısa bir bilgi panelinde listeler.
// Öğrenci ana sayfası, öğrenci program ve eğitmen Program sayfası ortak kullanır.
@Component({
  selector: 'app-event-calendar',
  imports: [MatDatepickerModule, MatIconModule, DatePipe],
  template: `
    <mat-calendar [selected]="selectedDate()" (selectedChange)="onDateSelected($event)" [dateClass]="dateClass" />

    <!-- Seçilen günün olayları (tıklayınca açılan kısa bilgi paneli) -->
    @if (selectedEvents().length > 0) {
      <div class="day-info">
        <div class="day-info-head">
          <strong>{{ selectedDate() | date: 'dd MMMM yyyy' }}</strong>
          <button type="button" (click)="closeInfo()" aria-label="Kapat"><mat-icon>close</mat-icon></button>
        </div>
        <ul>
          @for (ev of selectedEvents(); track ev.label) {
            <li>
              <span class="dot" [class]="ev.kind"></span>
              <span class="text">{{ ev.label }}</span>
            </li>
          }
        </ul>
      </div>
    }
  `,
  styleUrl: './event-calendar.scss',
})
export class EventCalendar implements AfterViewInit, OnDestroy {
  readonly events = input<CalendarEvent[]>([]);

  protected readonly today = new Date();
  // Tıklanan gün (bilgi paneli için); null ise panel kapalı
  protected readonly selectedDate = signal<Date | null>(null);

  @ViewChild(MatCalendar) private calendar?: MatCalendar<Date>;
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private observer?: MutationObserver;

  // Gün anahtarı (toDateString) → o güne ait olaylar
  private readonly byDay = computed(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of this.events()) {
      const key = new Date(event.date).toDateString();
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    return map;
  });

  // Seçili günün olayları (bilgi panelinde listelenir)
  protected readonly selectedEvents = computed<CalendarEvent[]>(() => {
    const date = this.selectedDate();
    if (!date) return [];
    return this.byDay().get(date.toDateString()) ?? [];
  });

  constructor() {
    // Olaylar sonradan (API cevabıyla) gelir: takvimi yeniden çizdir + tooltip'leri uygula
    effect(() => {
      this.byDay(); // bağımlılık
      this.calendar?.updateTodaysDate(); // hücre sınıflarını tazeler
      queueMicrotask(() => this.applyTooltips());
    });
  }

  // Bir güne tıklanınca: o günün olayları varsa paneli aç, yoksa kapat
  onDateSelected(date: Date | null): void {
    this.selectedDate.set(date);
  }

  closeInfo(): void {
    this.selectedDate.set(null);
  }

  // mat-calendar [dateClass]: işaretli günlere renk sınıfı ekler
  readonly dateClass = (date: Date, view: string): string => {
    if (view !== 'month') return '';
    const list = this.byDay().get(date.toDateString());
    if (!list) return '';
    const kinds = new Set(list.map((e) => e.kind));
    const classes: string[] = [];
    if (kinds.has('publish')) classes.push('publish-day');
    if (kinds.has('announcement')) classes.push('announcement-day');
    if (kinds.has('deadline')) classes.push('deadline-day'); // birden fazlaysa kırmızı kazanır
    return classes.join(' ');
  };

  ngAfterViewInit(): void {
    // Ay değişince hücreler yeniden çizilir; her çizim sonrası tooltip'leri tekrar uygula.
    // (mat-calendar hücrelere doğrudan tooltip verme imkânı sunmadığı için title kullanılır)
    this.observer = new MutationObserver(() => this.applyTooltips());
    this.observer.observe(this.host.nativeElement, { childList: true, subtree: true });
    this.applyTooltips();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  // İşaretli hücrelere native title (hover tooltip) yazar.
  // Hücrenin tarihi = görüntülenen ay (activeDate) + hücredeki gün numarası.
  private applyTooltips(): void {
    const active = this.calendar?.activeDate;
    if (!active) return;

    const cells = this.host.nativeElement.querySelectorAll<HTMLElement>('.mat-calendar-body-cell');
    cells.forEach((cell) => {
      const marked =
        cell.classList.contains('deadline-day') || cell.classList.contains('publish-day') || cell.classList.contains('announcement-day');
      if (!marked) {
        cell.removeAttribute('title');
        return;
      }

      const day = Number(cell.querySelector('.mat-calendar-body-cell-content')?.textContent?.trim());
      if (!day) return;

      const date = new Date(active.getFullYear(), active.getMonth(), day);
      const list = this.byDay().get(date.toDateString());
      if (list) cell.title = list.map((e) => e.label).join('\n');
    });
  }
}
