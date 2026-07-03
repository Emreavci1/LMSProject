import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MockDataService } from '../../../core/services/mock-data.service';

// Eğitmen: Program — haftalık ders/etkinlik takvimi (mock)
@Component({
  selector: 'app-schedule',
  imports: [MatIconModule],
  templateUrl: './schedule.html',
  styleUrl: './schedule.scss',
})
export class Schedule {
  protected mock = inject(MockDataService);

  readonly days = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];

  eventsOf(dayIndex: number) {
    return this.mock.scheduleEvents().filter((e) => e.day === dayIndex);
  }
}
