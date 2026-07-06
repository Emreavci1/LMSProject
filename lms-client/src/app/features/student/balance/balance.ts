import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MockDataService } from '../../../core/services/mock-data.service';

// Öğrenci: Bakiyem — mevcut bakiye + işlem geçmişi
// Not: Ödeme sistemi henüz yok; bu sayfa UI iskeletidir.
@Component({
  selector: 'app-balance',
  imports: [MatIconModule, DatePipe, DecimalPipe],
  templateUrl: './balance.html',
  styleUrl: './balance.scss',
})
export class Balance {
  protected mock = inject(MockDataService);
}
