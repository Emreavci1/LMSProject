import { UserRole } from './auth.models';

// GET /api/users cevabı (UserDto)
export interface User {
  id: number;
  fullName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdDate: string;
}

// POST /api/users isteği (CreateUserDto)
export interface CreateUser {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
}

// PUT /api/users/{id} isteği (UpdateUserDto)
// Password boş bırakılırsa şifre değişmez
export interface UpdateUser {
  fullName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  password?: string;
}
