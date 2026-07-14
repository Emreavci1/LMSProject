import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { Login } from './features/auth/login/login';
import { PanelLayout } from './shared/components/panel-layout/panel-layout';

export const routes: Routes = [
  // Herkese açık tek sayfa
  { path: 'login', component: Login },

  // --- Korumalı sayfalar: PanelLayout sidebar ile sarılmış ---
  {
    path: '',
    component: PanelLayout,
    canActivate: [authGuard],
    children: [
      // Dashboard / ana sayfa (role göre yönlendirme Dashboard bileşeninde)
      {
        path: '',
        loadComponent: () =>
          import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },

      // ---- Öğrenci sayfaları ----
      {
        path: 'program',
        loadComponent: () =>
          import('./features/student/program/program').then((m) => m.ProgramComponent),
      },
      {
        path: 'discover',
        loadComponent: () =>
          import('./features/student/discover/discover').then((m) => m.Discover),
      },
      {
        path: 'my-courses',
        loadComponent: () =>
          import('./features/student/my-courses/my-courses').then((m) => m.MyCourses),
      },
      // Kurs oynatıcı (kurs + dersler backend API'den)
      {
        path: 'learn/:id',
        loadComponent: () =>
          import('./features/student/player/player').then((m) => m.Player),
      },
      // ---- Ortak sayfalar ----
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/shared-pages/profile/profile').then((m) => m.Profile),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/shared-pages/settings/settings').then((m) => m.Settings),
      },

      // ---- Eğitmen sayfaları ----
      {
        path: 'instructor/announcements',
        loadComponent: () =>
          import('./features/shared-pages/announcement-manage/announcement-manage').then((m) => m.AnnouncementManageComponent),
        canActivate: [roleGuard],
        data: { roles: ['Instructor', 'Admin'] },
      },
      {
        path: 'instructor/courses',
        loadComponent: () =>
          import('./features/instructor/instructor-courses/instructor-courses').then(
            (m) => m.InstructorCourses
          ),
        canActivate: [roleGuard],
        data: { roles: ['Instructor', 'Admin'] },
      },
      {
        path: 'instructor/courses/new',
        loadComponent: () =>
          import('./features/instructor/course-create/course-create').then(
            (m) => m.CourseCreate
          ),
        canActivate: [roleGuard],
        data: { roles: ['Instructor', 'Admin'] },
      },
      {
        path: 'instructor/courses/:id',
        loadComponent: () =>
          import('./features/instructor/course-manage/course-manage').then(
            (m) => m.CourseManage
          ),
        canActivate: [roleGuard],
        data: { roles: ['Instructor', 'Admin'] },
      },
      {
        path: 'instructor/schedule',
        loadComponent: () =>
          import('./features/instructor/schedule/schedule').then((m) => m.Schedule),
        canActivate: [roleGuard],
        data: { roles: ['Instructor', 'Admin'] },
      },

      // ---- Admin sayfaları ----
      {
        path: 'admin/announcements',
        loadComponent: () =>
          import('./features/shared-pages/announcement-manage/announcement-manage').then((m) => m.AnnouncementManageComponent),
        canActivate: [roleGuard],
        data: { roles: ['Admin'] },
      },
      {
        path: 'admin/overview',
        loadComponent: () =>
          import('./features/admin/overview/overview').then((m) => m.Overview),
        canActivate: [roleGuard],
        data: { roles: ['Admin'] },
      },
      {
        path: 'admin/users',
        loadComponent: () =>
          import('./features/admin/user-list/user-list').then((m) => m.UserList),
        canActivate: [roleGuard],
        data: { roles: ['Admin'] },
      },
      // Kullanıcı detayı: bilgiler + katıldığı/açtığı eğitimler
      {
        path: 'admin/users/:id',
        loadComponent: () =>
          import('./features/admin/user-detail/user-detail').then((m) => m.UserDetail),
        canActivate: [roleGuard],
        data: { roles: ['Admin'] },
      },
      {
        path: 'admin/courses',
        loadComponent: () =>
          import('./features/admin/admin-course-list/admin-course-list').then(
            (m) => m.AdminCourseList
          ),
        canActivate: [roleGuard],
        data: { roles: ['Admin'] },
      },
      // Zorunlu eğitim raporu: tüm atamalar + tamamlama/gecikme durumları
      {
        path: 'admin/assignments',
        loadComponent: () =>
          import('./features/admin/assignment-report/assignment-report').then(
            (m) => m.AssignmentReportPage
          ),
        canActivate: [roleGuard],
        data: { roles: ['Admin'] },
      },
      // Admin eğitim oluşturma: eğitmenle aynı bileşen, ayrı adres
      // (kaydet/iptal yönlendirmeleri role göre admin paneline döner)
      {
        path: 'admin/courses/new',
        loadComponent: () =>
          import('./features/instructor/course-create/course-create').then(
            (m) => m.CourseCreate
          ),
        canActivate: [roleGuard],
        data: { roles: ['Admin'] },
      },

      // ---- Eski genel kurs sayfaları (herkes erişebilir) ----
      {
        path: 'courses',
        loadComponent: () =>
          import('./features/courses/course-list/course-list').then((m) => m.CourseList),
      },
      {
        path: 'courses/new',
        loadComponent: () =>
          import('./features/courses/course-form/course-form').then((m) => m.CourseForm),
        canActivate: [roleGuard],
        data: { roles: ['Instructor', 'Admin'] },
      },
      {
        path: 'courses/:id/edit',
        loadComponent: () =>
          import('./features/courses/course-form/course-form').then((m) => m.CourseForm),
        canActivate: [roleGuard],
        data: { roles: ['Instructor', 'Admin'] },
      },
      {
        path: 'courses/:id',
        loadComponent: () =>
          import('./features/courses/course-detail/course-detail').then(
            (m) => m.CourseDetail
          ),
      },
    ],
  },

  // Bilinmeyen adresler ana sayfaya
  { path: '**', redirectTo: '' },
];
