import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { AnnouncementService } from '../../../core/services/announcement.service';
import { Announcement } from '../../../core/models/announcement.models';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AnnouncementFormDialogComponent } from './announcement-form-dialog/announcement-form-dialog';
import { AnnouncementDetailDialogComponent } from './announcement-detail-dialog/announcement-detail-dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth.service';
import { avatarSrc } from '../../../core/utils/avatar.util';

@Component({
  selector: 'app-announcement-manage',
  standalone: true,
  imports: [
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  templateUrl: './announcement-manage.html',
  styleUrl: './announcement-manage.scss'
})
export class AnnouncementManageComponent implements OnInit {
  private announcementService = inject(AnnouncementService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  auth = inject(AuthService);
  protected readonly avatarSrc = avatarSrc;

  announcements = signal<Announcement[]>([]);

  ngOnInit(): void {
    this.loadAnnouncements();
  }

  // Yayın tarihi gelecekteyse "Planlandı", değilse "Yayında"
  isScheduled(a: Announcement): boolean {
    return new Date(a.publishDate).getTime() > Date.now();
  }

  // Son geçerlilik geçmişse duyuru artık kimseye görünmez (süresi doldu)
  isExpired(a: Announcement): boolean {
    return !!a.expiryDate && new Date(a.expiryDate).getTime() <= Date.now();
  }

  loadAnnouncements(): void {
    this.announcementService.getManagedAnnouncements().subscribe({
      next: (data) => this.announcements.set(data),
      error: () => this.snackBar.open('Duyurular yüklenirken hata oluştu.', 'Kapat', { duration: 3000 })
    });
  }

  // Başlığa tıklayınca duyurunun tam içeriğini salt-okunur gösterir
  openDetail(announcement: Announcement): void {
    this.dialog.open(AnnouncementDetailDialogComponent, {
      width: '600px',
      data: announcement,
    });
  }

  openForm(announcement?: Announcement): void {
    const dialogRef = this.dialog.open(AnnouncementFormDialogComponent, {
      width: '600px',
      data: announcement || null
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadAnnouncements();
      }
    });
  }

  deleteAnnouncement(id: number): void {
    if (confirm('Bu duyuruyu silmek istediğinize emin misiniz?')) {
      this.announcementService.delete(id).subscribe({
        next: () => {
          this.snackBar.open('Duyuru başarıyla silindi.', 'Kapat', { duration: 3000 });
          this.loadAnnouncements();
        },
        error: () => this.snackBar.open('Duyuru silinirken hata oluştu.', 'Kapat', { duration: 3000 })
      });
    }
  }
}
