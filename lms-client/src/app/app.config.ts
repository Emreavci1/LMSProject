import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeTr from '@angular/common/locales/tr';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MAT_DATE_LOCALE, provideNativeDateAdapter } from '@angular/material/core';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';

// Türkçe tarih verilerini kaydet (DatePipe ay/gün adları için gerekli)
registerLocaleData(localeTr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // withComponentInputBinding: route parametreleri (:id) doğrudan input()'a bağlanır
    provideRouter(routes, withComponentInputBinding()),
    // HTTP istemcisi + JWT token'ı her isteğe ekleyen interceptor
    provideHttpClient(withInterceptors([authInterceptor])),
    // Material dialog/snackbar animasyonları için
    provideAnimationsAsync(),
    // mat-calendar/datepicker için tarih adaptörü (JS Date kullanır)
    provideNativeDateAdapter(),
    // Uygulama geneli Türkçe: DatePipe çıktıları Türkçe olur ("16 Tem 2026")
    { provide: LOCALE_ID, useValue: 'tr' },
    // mat-calendar Türkçe locale kullanır → hafta PAZARTESİ başlar,
    // ay/gün başlıkları Türkçe olur (tüm takvimler için tek yerden)
    { provide: MAT_DATE_LOCALE, useValue: 'tr-TR' },
  ],
};
