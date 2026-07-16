import { DatePipe } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Announcement } from '../../../../core/models/announcement.models';
import { avatarSrc } from '../../../../core/utils/avatar.util';
import { fileUrl } from '../../../../core/utils/file-url.util';

// Duyuru detayını salt-okunur gösteren dialog (başlığa tıklayınca açılır):
// tam içerik, gönderen, hedef, tarihler ve varsa ek dosya bağlantısı.
@Component({
  selector: 'app-announcement-detail-dialog',
  standalone: true,
  imports: [DatePipe, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './announcement-detail-dialog.html',
  styleUrl: './announcement-detail-dialog.scss',
})
export class AnnouncementDetailDialogComponent {
  protected readonly avatarSrc = avatarSrc;
  protected readonly fileUrl = fileUrl;

  constructor(@Inject(MAT_DIALOG_DATA) public announcement: Announcement) {}
}
