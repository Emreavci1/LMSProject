import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { UpdateUser, User } from '../../../core/models/user.models';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { UserService } from '../../../core/services/user.service';
import { UserFormDialog } from '../user-form-dialog/user-form-dialog';
import { avatarSrc } from '../../../core/utils/avatar.util';

@Component({
  selector: 'app-user-list',
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatDialogModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    RouterLink,
  ],
  templateUrl: './user-list.html',
  styleUrl: './user-list.scss',
})
export class UserList {
  private userService = inject(UserService);
  private notification = inject(NotificationService);
  private dialog = inject(MatDialog);
  protected auth = inject(AuthService);

  protected readonly avatarSrc = avatarSrc;
  readonly loading = signal(true);
  readonly users = signal<User[]>([]);
  readonly displayedColumns = ['role', 'fullName', 'email', 'status', 'actions'];

  // mat-table satırları 'any' tipli olduğundan string index kullanıyoruz
  readonly roleLabels: Record<string, string> = {
    CourseAttendee: 'Katılımcı',
    Instructor: 'Eğitmen',
    Admin: 'Yönetici',
  };

  constructor() {
    this.load();
  }

  // Rol sırası: önce Yönetici, sonra Eğitmen, sonra Katılımcı
  private readonly roleOrder: Record<string, number> = {
    Admin: 0,
    Instructor: 1,
    CourseAttendee: 2,
  };

  private load(): void {
    this.loading.set(true);
    this.userService.getAll().subscribe({
      next: (users) => {
        // Role göre grupla, aynı rol içinde ada göre alfabetik sırala
        this.users.set(
          [...users].sort(
            (a, b) =>
              (this.roleOrder[a.role] ?? 99) - (this.roleOrder[b.role] ?? 99) ||
              a.fullName.localeCompare(b.fullName, 'tr')
          )
        );
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.notification.fromHttpError(err, 'Kullanıcılar yüklenemedi.');
      },
    });
  }

  openCreate(): void {
    this.openDialog();
  }

  openEdit(user: User): void {
    this.openDialog(user);
  }

  private openDialog(user?: User): void {
    const ref = this.dialog.open(UserFormDialog, {
      data: { user },
      width: '440px',
      maxWidth: '95vw',
    });
    // Dialog true dönerse (kayıt yapıldı) listeyi yenile
    ref.afterClosed().subscribe((result) => {
      if (result) this.load();
    });
  }

  deactivate(user: User): void {
    // Kendi hesabını pasifleştirmeyi backend zaten engelliyor; UI'da da butonu gizliyoruz
    if (!confirm(`"${user.fullName}" pasifleştirilsin mi?`)) return;

    this.userService.deactivate(user.id).subscribe({
      next: () => {
        this.notification.success('Kullanıcı pasifleştirildi.');
        this.load();
      },
      error: (err) => this.notification.fromHttpError(err, 'İşlem başarısız.'),
    });
  }

  // Pasif kullanıcıyı tekrar aktifleştir (PUT ile isActive=true; diğer alanlar korunur)
  reactivate(user: User): void {
    const payload: UpdateUser = {
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl ?? null,
      isActive: true,
    };
    this.userService.update(user.id, payload).subscribe({
      next: () => {
        this.notification.success('Kullanıcı aktifleştirildi.');
        this.load();
      },
      error: (err) => this.notification.fromHttpError(err, 'İşlem başarısız.'),
    });
  }

  // Giriş yapan admin'in kendi satırı mı? (kendini pasifleştiremez)
  isSelf(user: User): boolean {
    return user.id === this.auth.currentUser()?.userId;
  }
}
