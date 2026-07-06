import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserRole } from '../models/auth.models';
import { AuthService } from '../services/auth.service';

// Rol bazlı sayfa koruması. Kullanımı (route tanımında):
//   canActivate: [roleGuard], data: { roles: ['Admin'] }
// Not: Bu yalnızca kullanıcı deneyimi içindir —
// gerçek güvenlik her zaman backend'de doğrulanır.
export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const allowedRoles = (route.data['roles'] ?? []) as UserRole[];
  const userRole = authService.role();

  if (userRole && allowedRoles.includes(userRole)) {
    return true;
  }

  // Yetkisi yoksa ana sayfaya (dashboard) yönlendir
  return router.createUrlTree(['/']);
};
