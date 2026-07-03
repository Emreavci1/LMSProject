// Backend'deki DTO'ların TypeScript karşılıkları

export type UserRole = 'CourseAttendee' | 'Instructor' | 'Admin';

// POST /api/auth/login isteği (LoginRequestDto)
export interface LoginRequest {
  email: string;
  password: string;
}

// POST /api/auth/login cevabı (LoginResponseDto)
export interface LoginResponse {
  userId: number;
  token: string;
  expiresAt: string; // ISO tarih
  fullName: string;
  email: string;
  role: UserRole;
}

// localStorage'da saklanan oturum bilgisi
export interface AuthUser {
  userId: number;
  fullName: string;
  email: string;
  role: UserRole;
  expiresAt: string;
}
