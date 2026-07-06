import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

// Her HTTP isteğine JWT token'ı otomatik ekler.
// API 401 dönerse (token süresi dolmuş vb.) kullanıcıyı login'e yönlendirir.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.token;

  // Token varsa Authorization header'ı ekle
  const request = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      // 401 = kimlik geçersiz → oturumu kapat, login'e dön
      // (login isteğinin kendisi hariç — orada 401 "şifre yanlış" demek)
      if (error.status === 401 && !req.url.includes('/auth/login')) {
        authService.logout();
      }
      return throwError(() => error);
    })
  );
};
