import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { API_URL } from '../api.config';
import { AuthUser, LoginRequest, LoginResponse, UserRole } from '../models/auth.models';

const TOKEN_KEY = 'lms_token';
const USER_KEY = 'lms_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  // Oturum durumu signal olarak tutulur — değişince ekran otomatik güncellenir
  readonly currentUser = signal<AuthUser | null>(this.readUserFromStorage());
  readonly isLoggedIn = computed(() => this.currentUser() !== null);
  readonly role = computed<UserRole | null>(() => this.currentUser()?.role ?? null);

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${API_URL}/auth/login`, request).pipe(
      tap((response) => {
        // Token ve kullanıcı bilgisini sakla
        localStorage.setItem(TOKEN_KEY, response.token);
        const user: AuthUser = {
          userId: response.userId,
          fullName: response.fullName,
          email: response.email,
          role: response.role,
          expiresAt: response.expiresAt,
        };
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        this.currentUser.set(user);
      })
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  // Sayfa yenilendiğinde oturumu localStorage'dan geri yükle.
  // Token süresi dolmuşsa oturum geçersiz sayılır.
  private readUserFromStorage(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;

    try {
      const user = JSON.parse(raw) as AuthUser;
      if (new Date(user.expiresAt) <= new Date()) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        return null;
      }
      return user;
    } catch {
      return null;
    }
  }
}
