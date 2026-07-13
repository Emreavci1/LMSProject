import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { ImageCropperComponent, ImageCroppedEvent, LoadedImage } from 'ngx-image-cropper';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-image-cropper-dialog',
  templateUrl: './image-cropper-dialog.html',
  styleUrls: ['./image-cropper-dialog.scss'],
  standalone: true,
  imports: [MatDialogModule, ImageCropperComponent, MatButtonModule, MatIconModule],
  encapsulation: ViewEncapsulation.None
})
export class ImageCropperDialog {
  imageChangedEvent: any = '';
  croppedImage: any = '';
  croppedBase64: any = '';

  // Kırpma çerçevesi ayarları (dialog verisiyle özelleştirilebilir):
  // kurs kapağı 16:9 dikdörtgen (varsayılan), profil fotoğrafı 1:1 yuvarlak
  aspectRatio = 16 / 9;
  roundCropper = false;

  constructor(
    public dialogRef: MatDialogRef<ImageCropperDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.imageChangedEvent = data.imageChangedEvent;
    if (data.aspectRatio) this.aspectRatio = data.aspectRatio;
    if (data.roundCropper) this.roundCropper = true;
  }

  imageCropped(event: ImageCroppedEvent) {
    // Önizleme için objectUrl kullanabiliriz ama DB'ye kaydetmek için Base64 lazım.
    // ngx-image-cropper bazen event.base64'ü boş dönebilir, garanti olsun diye blob'dan çevireceğiz.
    if (event.base64) {
      this.croppedImage = event.base64;
    } else if (event.blob) {
      const reader = new FileReader();
      reader.onload = () => {
        this.croppedImage = reader.result as string;
      };
      reader.readAsDataURL(event.blob);
    } else {
      this.croppedImage = event.objectUrl; // Fallback
    }
  }

  imageLoaded(image: LoadedImage) {
    // show cropper
  }

  cropperReady() {
    // cropper ready
  }

  loadImageFailed() {
    // show message
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    this.dialogRef.close(this.croppedImage); // Bu artık Base64 string döner
  }
}
