import { Component, computed, inject, signal } from '@angular/core';
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
// Şimdilik tek tek seçim; filtreleme/toplu atama ileride eklenecek.
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
  readonly selectedUserId = signal<number | null>(null);

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

  select(userId: number): void {
    this.selectedUserId.set(this.selectedUserId() === userId ? null : userId);
  }

  assign(): void {
    const userId = this.selectedUserId();
    if (!userId || !this.dueDate() || this.saving()) return;

    // Yerel tarih+saat → UTC (ISO): backend tüm tarihleri UTC saklar/karşılaştırır
    const dueDateIso = new Date(`${this.dueDate()}T${this.dueTime() || '23:59'}`).toISOString();

    this.saving.set(true);
    this.enrollmentService
      .assign({ userId, courseId: this.data.courseId, dueDate: dueDateIso })
      .subscribe({
        next: () => {
          this.notification.success('Katılımcı atandı.');
          this.dialogRef.close(true); // true → liste yenilensin
        },
        error: (err) => {
          this.saving.set(false);
          this.notification.fromHttpError(err, 'Atama yapılamadı.');
        },
      });
  }
}
