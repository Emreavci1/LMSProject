import { Component, computed, inject, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { User } from '../../../core/models/user.models';
import { EnrollmentService } from '../../../core/services/enrollment.service';
import { NotificationService } from '../../../core/services/notification.service';
import { UserService } from '../../../core/services/user.service';
import { avatarSrc } from '../../../core/utils/avatar.util';

// Dialog'a dışarıdan gelen veri: hangi kursa atama yapılacak + zaten kayıtlı olanlar
export interface AssignAttendeeData {
  courseId: number;
  courseTitle: string;
  // Zaten kayıtlı/atanmış kullanıcılar listede gösterilmez
  excludedUserIds: number[];
}

// Admin: zorunlu eğitime katılımcı atama dialogu.
// Çoklu seçim desteklenir: işaretlenen herkese aynı son tarihle atama yapılır.
@Component({
  selector: 'app-assign-attendee-dialog',
  imports: [
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './assign-attendee-dialog.html',
  styleUrl: './assign-attendee-dialog.scss',
})
export class AssignAttendeeDialog {
  private userService = inject(UserService);
  private enrollmentService = inject(EnrollmentService);
  private notification = inject(NotificationService);
  private dialogRef = inject(MatDialogRef<AssignAttendeeDialog>);
  protected data = inject<AssignAttendeeData>(MAT_DIALOG_DATA);

  protected readonly avatarSrc = avatarSrc;
  readonly loading = signal(true);
  readonly saving = signal(false);

  // Atanabilecek kullanıcılar: aktif katılımcılar, kursa zaten kayıtlı olmayanlar
  readonly candidates = signal<User[]>([]);

  readonly search = signal('');
  // Çoklu seçim: işaretlenen kullanıcı id'leri
  readonly selectedIds = signal<Set<number>>(new Set());

  // Tarih + saat seçici: bugünden önce seçilemesin.
  // Saat varsayılanı 23:59 — yalnızca tarih seçen için "gün sonuna kadar" davranışı
  protected readonly todayStr = new Date().toISOString().split('T')[0];
  readonly dueDate = signal('');
  readonly dueTime = signal('23:59');

  readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const list = this.candidates();
    if (!q) return list;
    return list.filter(
      (u) => u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  });

  constructor() {
    this.userService.getAll().subscribe({
      next: (users) => {
        const excluded = new Set(this.data.excludedUserIds);
        this.candidates.set(
          users.filter(
            (u) => u.role === 'CourseAttendee' && u.isActive && !excluded.has(u.id)
          )
        );
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notification.error('Kullanıcılar yüklenemedi.');
      },
    });
  }

  // Satıra tıklayınca seçimi aç/kapat (çoklu seçim)
  select(userId: number): void {
    this.selectedIds.update((set) => {
      const next = new Set(set);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  isSelected(userId: number): boolean {
    return this.selectedIds().has(userId);
  }

  // Filtrelenmiş listenin tamamı seçili mi? (Tümünü Seç butonunun durumu)
  readonly allFilteredSelected = computed(() => {
    const list = this.filtered();
    return list.length > 0 && list.every((u) => this.selectedIds().has(u.id));
  });

  // Aramada görünenlerin hepsini seç / hepsini bırak
  toggleAll(): void {
    const list = this.filtered();
    const allSelected = this.allFilteredSelected();
    this.selectedIds.update((set) => {
      const next = new Set(set);
      for (const u of list) {
        if (allSelected) next.delete(u.id);
        else next.add(u.id);
      }
      return next;
    });
  }

  assign(): void {
    const ids = [...this.selectedIds()];
    if (ids.length === 0 || !this.dueDate() || this.saving()) return;

    // Yerel tarih+saat → UTC (ISO): backend tüm tarihleri UTC saklar/karşılaştırır
    const dueDateIso = new Date(`${this.dueDate()}T${this.dueTime() || '23:59'}`).toISOString();

    this.saving.set(true);
    // Her kullanıcı için ayrı atama isteği; biri hata verse de diğerleri sürer
    forkJoin(
      ids.map((userId) =>
        this.enrollmentService
          .assign({ userId, courseId: this.data.courseId, dueDate: dueDateIso })
          .pipe(
            map(() => true),
            catchError(() => of(false))
          )
      )
    ).subscribe((results) => {
      const ok = results.filter(Boolean).length;
      const fail = results.length - ok;
      if (fail === 0) {
        this.notification.success(ok === 1 ? 'Katılımcı atandı.' : `${ok} katılımcı atandı.`);
      } else if (ok > 0) {
        this.notification.error(`${ok} katılımcı atandı, ${fail} atama başarısız oldu.`);
      } else {
        this.notification.error('Atamalar yapılamadı.');
      }
      // En az bir atama başarılıysa listeyi yeniletmek için true döneriz
      if (ok > 0) this.dialogRef.close(true);
      else this.saving.set(false);
    });
  }
}
