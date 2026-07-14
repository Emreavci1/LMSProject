import { Component, Inject, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { AnnouncementService } from '../../../../core/services/announcement.service';
import { CourseService } from '../../../../core/services/course.service';
import { UploadService } from '../../../../core/services/upload.service';
import { Announcement } from '../../../../core/models/announcement.models';
import { Course } from '../../../../core/models/course.models';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-announcement-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatInputModule,
    MatFormFieldModule,
    MatSlideToggleModule,
    MatSelectModule,
    MatIconModule,
    MatDividerModule
  ],
  templateUrl: './announcement-form-dialog.html',
  styleUrl: './announcement-form-dialog.scss'
})
export class AnnouncementFormDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private announcementService = inject(AnnouncementService);
  private courseService = inject(CourseService);
  private uploadService = inject(UploadService);
  private snackBar = inject(MatSnackBar);
  auth = inject(AuthService);

  form: FormGroup;
  isEditMode = false;
  saving = false;

  courses: Course[] = [];
  filteredCourses: Course[] = [];

  // Ek dosya durumu
  attachmentUrl: string | null = null;
  attachmentName: string | null = null;
  uploadingAttachment = false;

  constructor(
    public dialogRef: MatDialogRef<AnnouncementFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Announcement | null
  ) {
    this.isEditMode = !!data;

    // Düzenlemede mevcut eki koru
    this.attachmentUrl = data?.attachmentUrl ?? null;
    this.attachmentName = data?.attachmentName ?? null;

    const pub = data?.publishDate ? new Date(data.publishDate) : new Date();
    // Son geçerlilik: varsa doldur, yoksa varsayılan olarak 7 gün sonrası (kapalı halde)
    const hasExpiry = !!data?.expiryDate;
    const exp = data?.expiryDate ? new Date(data.expiryDate) : this.defaultExpiry();
    this.form = this.fb.group({
      title: [data?.title || '', [Validators.required, Validators.maxLength(200)]],
      content: [data?.content || '', [Validators.required, Validators.maxLength(4000)]],
      // Hedef: 'global' genel duyuru, 'course' eğitime özel
      target: [data?.courseId ? 'course' : 'global'],
      courseId: [data?.courseId || null],
      publishDate: [this.toDateInput(pub), Validators.required],
      publishTime: [this.toTimeInput(pub), Validators.required],
      // Son geçerlilik tarihi (opsiyonel)
      hasExpiry: [hasExpiry],
      expiryDate: [this.toDateInput(exp)],
      expiryTime: [this.toTimeInput(exp)],
      isActive: [this.isEditMode ? (data as any).isActive ?? true : true]
    });
  }

  ngOnInit(): void {
    if (!this.isEditMode) {
      this.loadCourses();
    }
  }

  // Segment butonundan hedef değişince kurs seçimini sıfırla
  get isCourseTarget(): boolean {
    return this.form.get('target')?.value === 'course';
  }

  setTarget(value: 'global' | 'course'): void {
    this.form.get('target')?.setValue(value);
    if (value === 'global') {
      this.form.get('courseId')?.setValue(null);
    }
  }

  loadCourses(): void {
    const role = this.auth.role();
    const req = role === 'Admin' ? this.courseService.getAllForAdmin() : this.courseService.getMyCourses();
    req.subscribe({
      next: (data) => {
        this.courses = data;
        this.filteredCourses = data;
      }
    });
  }

  filterCourses(event: Event): void {
    const value = (event.target as HTMLInputElement).value.toLowerCase();
    this.filteredCourses = this.courses.filter(c => c.title.toLowerCase().includes(value));
  }

  // Dropdown her açıldığında filtreyi sıfırla (eski arama kalmasın) ve
  // arama kutusuna odağı ver — 50+ derste yazıp bulmayı kolaylaştırır
  onSelectOpened(opened: boolean, searchInput: HTMLInputElement): void {
    if (opened) {
      searchInput.value = '';
      this.filteredCourses = this.courses;
      setTimeout(() => searchInput.focus(), 0);
    }
  }

  // Dosya seçilince hemen yükle (dönen URL'i tut, kaydederken duyuruya bağla)
  onAttachmentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploadingAttachment = true;
    this.uploadService.uploadAttachment(file).subscribe({
      next: (res) => {
        this.attachmentUrl = res.url;
        this.attachmentName = res.fileName;
        this.uploadingAttachment = false;
      },
      error: (err) => {
        this.uploadingAttachment = false;
        const msg = err?.error?.message ?? 'Dosya yüklenemedi.';
        this.snackBar.open(msg, 'Kapat', { duration: 4000 });
      },
    });
    input.value = ''; // aynı dosya tekrar seçilebilsin
  }

  removeAttachment(): void {
    this.attachmentUrl = null;
    this.attachmentName = null;
  }

  onSubmit(): void {
    if (this.form.invalid || this.saving) return;
    const v = this.form.value;

    // Eğitime özel seçildiyse kurs zorunlu
    if (!this.isEditMode && v.target === 'course' && !v.courseId) {
      this.snackBar.open('Lütfen bir eğitim seçin.', 'Kapat', { duration: 3000 });
      return;
    }

    // Tarih + saat birleşip UTC ISO'ya çevrilir (tarayıcı yerelinden)
    const payloadDate = this.combineDateTime(v.publishDate, v.publishTime);
    // Son geçerlilik: yalnızca işaretliyse gönderilir (yoksa süresiz)
    const expiryPayload = v.hasExpiry ? this.combineDateTime(v.expiryDate, v.expiryTime) : null;

    // Bitiş, yayından önce olamaz
    if (expiryPayload && new Date(expiryPayload).getTime() <= new Date(payloadDate).getTime()) {
      this.snackBar.open('Son geçerlilik tarihi, yayın tarihinden sonra olmalı.', 'Kapat', { duration: 4000 });
      return;
    }
    this.saving = true;

    if (this.isEditMode && this.data) {
      this.announcementService.update(this.data.id, {
        title: v.title,
        content: v.content,
        publishDate: payloadDate,
        expiryDate: expiryPayload,
        isActive: v.isActive,
        attachmentUrl: this.attachmentUrl,
        attachmentName: this.attachmentName
      }).subscribe({
        next: () => {
          this.snackBar.open('Duyuru güncellendi.', 'Kapat', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: () => { this.saving = false; this.snackBar.open('Güncelleme başarısız.', 'Kapat', { duration: 3000 }); }
      });
    } else {
      this.announcementService.create({
        title: v.title,
        content: v.content,
        courseId: v.target === 'course' ? v.courseId : null,
        publishDate: payloadDate,
        expiryDate: expiryPayload,
        attachmentUrl: this.attachmentUrl,
        attachmentName: this.attachmentName
      }).subscribe({
        next: () => {
          this.snackBar.open('Duyuru oluşturuldu.', 'Kapat', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: () => { this.saving = false; this.snackBar.open('Duyuru oluşturma başarısız.', 'Kapat', { duration: 3000 }); }
      });
    }
  }

  // --- Tarih/saat yardımcıları (native input <-> Date) ---
  private toDateInput(d: Date): string {
    return `${d.getFullYear()}-${this.pad(d.getMonth() + 1)}-${this.pad(d.getDate())}`;
  }
  private toTimeInput(d: Date): string {
    return `${this.pad(d.getHours())}:${this.pad(d.getMinutes())}`;
  }
  private combineDateTime(date: string, time: string): string {
    const [y, m, day] = date.split('-').map(Number);
    const [h, min] = time.split(':').map(Number);
    return new Date(y, m - 1, day, h, min).toISOString();
  }
  private pad(n: number): string {
    return n.toString().padStart(2, '0');
  }
  // Son geçerlilik açılırsa varsayılan: 7 gün sonrası, gün sonu (23:59)
  private defaultExpiry(): Date {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setHours(23, 59, 0, 0);
    return d;
  }
}
