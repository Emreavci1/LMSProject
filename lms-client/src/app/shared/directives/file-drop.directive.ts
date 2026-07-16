import { Directive, ElementRef, inject, output, signal } from '@angular/core';

// Bir kutuya dosya sürükleyip bırakmayı sağlar.
// Kullanım: <div appFileDrop (fileDropped)="uploadFile($event)">
// Sürükleme sırasında kutuya "drag-over" sınıfı eklenir (stil için).
// Not: bırakılan dosyanın tip/boyut doğrulaması yükleme servisinde ve
// backend'de yapılır — burada yalnızca dosyayı iletiriz.
@Directive({
  selector: '[appFileDrop]',
  host: {
    '[class.drag-over]': 'dragOver()',
    '(dragover)': 'onDragOver($event)',
    '(dragleave)': 'onDragLeave($event)',
    '(drop)': 'onDrop($event)',
  },
})
export class FileDropDirective {
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  // Kutuya dosya bırakılınca yayınlanır (yalnızca ilk dosya)
  readonly fileDropped = output<File>();

  protected readonly dragOver = signal(false);

  onDragOver(event: DragEvent): void {
    // preventDefault şart: yoksa tarayıcı dosyayı sayfada açar
    event.preventDefault();
    this.dragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    // Kutu içindeki ikon/yazı üzerine geçerken tetiklenen sahte "ayrılma"ları ele:
    // hedef hâlâ kutunun içindeyse vurguyu kaldırma
    const next = event.relatedTarget as Node | null;
    if (next && this.host.nativeElement.contains(next)) return;
    this.dragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this.fileDropped.emit(file);
  }
}
