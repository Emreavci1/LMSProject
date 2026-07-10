import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideNativeDateAdapter } from '@angular/material/core';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';

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
  ],
};
