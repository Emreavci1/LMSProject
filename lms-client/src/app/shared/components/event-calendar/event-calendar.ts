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
} from '@angular/core';
import { MatCalendar, MatDatepickerModule } from '@angular/material/datepicker';

// Tooltip metinlerinde saat göstermek için ortak yardımcı (örn. "17:30")
export function timeLabel(date: string): string {
  return new Date(date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

// Takvimde gösterilecek tek bir olay
export interface CalendarEvent {
  date: string; // ISO tarih (gün hassasiyetinde işaretlenir)
  label: string; // hover'da (tooltip) gösterilecek açıklama
  kind: 'deadline' | 'publish'; // kırmızı: son tarih, mavi: yayın tarihi
}

// Olay işaretli mini takvim: mat-calendar'ı sarar,
// günleri renklendirir ve üzerine gelince ne olduğunu (title tooltip) gösterir.
// Öğrenci ana sayfası ve eğitmen Program sayfası ortak kullanır.
@Component({
  selector: 'app-event-calendar',
  imports: [MatDatepickerModule],
  template: `<mat-calendar [selected]="today" [dateClass]="dateClass" />`,
  styleUrl: './event-calendar.scss',
})
export class EventCalendar implements AfterViewInit, OnDestroy {
  readonly events = input<CalendarEvent[]>([]);

  protected readonly today = new Date();

  @ViewChild(MatCalendar) private calendar?: MatCalendar<Date>;
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private observer?: MutationObserver;

  // Gün anahtarı (toDateString) → o güne ait tür ve açıklamalar
  private readonly byDay = computed(() => {
    const map = new Map<string, { kinds: Set<string>; labels: string[] }>();
    for (const event of this.events()) {
      const key = new Date(event.date).toDateString();
      const entry = map.get(key) ?? { kinds: new Set<string>(), labels: [] };
      entry.kinds.add(event.kind);
      entry.labels.push(event.label);
      map.set(key, entry);
    }
    return map;
  });

  constructor() {
    // Olaylar sonradan (API cevabıyla) gelir: takvimi yeniden çizdir + tooltip'leri uygula
    effect(() => {
      this.byDay(); // bağımlılık
      this.calendar?.updateTodaysDate(); // hücre sınıflarını tazeler
      queueMicrotask(() => this.applyTooltips());
    });
  }

  // mat-calendar [dateClass]: işaretli günlere renk sınıfı ekler
  readonly dateClass = (date: Date, view: string): string => {
    if (view !== 'month') return '';
    const entry = this.byDay().get(date.toDateString());
    if (!entry) return '';
    const classes: string[] = [];
    if (entry.kinds.has('publish')) classes.push('publish-day');
    if (entry.kinds.has('deadline')) classes.push('deadline-day'); // ikisi de varsa kırmızı kazanır
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
        cell.classList.contains('deadline-day') || cell.classList.contains('publish-day');
      if (!marked) {
        cell.removeAttribute('title');
        return;
      }

      const day = Number(cell.querySelector('.mat-calendar-body-cell-content')?.textContent?.trim());
      if (!day) return;

      const date = new Date(active.getFullYear(), active.getMonth(), day);
      const entry = this.byDay().get(date.toDateString());
      if (entry) cell.title = entry.labels.join('\n');
    });
  }
}
