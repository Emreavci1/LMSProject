import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  exact?: boolean; // kök '/' (Ana Sayfa) için tam eşleşme gerekir
}

// Tüm korumalı sayfaları saran panel düzeni:
// solda role göre değişen sidebar, sağda sayfa içeriği (router-outlet).
@Component({
  selector: 'app-panel-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule, MatButtonModule],
  templateUrl: './panel-layout.html',
  styleUrl: './panel-layout.scss',
})
export class PanelLayout {
  protected readonly auth = inject(AuthService);

  // Mobilde sidebar aç/kapa durumu
  readonly sidebarOpen = signal(false);
  // Masaüstünde daralt/genişlet durumu
  readonly sidebarCollapsed = signal(false);

  readonly roleLabel = computed(() => {
    switch (this.auth.role()) {
      case 'Admin': return 'Yönetici';
      case 'Instructor': return 'Eğitmen';
      case 'CourseAttendee': return 'Öğrenci';
      default: return '';
    }
  });

  // Role göre menü öğeleri
  readonly menuItems = computed<MenuItem[]>(() => {
    switch (this.auth.role()) {
      case 'CourseAttendee':
        return [
          { label: 'Ana Sayfa', icon: 'home', route: '/', exact: true },
          { label: 'Eğitimleri Keşfet', icon: 'explore', route: '/discover' },
          { label: 'Eğitimlerim', icon: 'school', route: '/my-courses' },
          { label: 'Bakiyem', icon: 'account_balance_wallet', route: '/balance' },
          { label: 'Profil', icon: 'person', route: '/profile' },
          { label: 'Ayarlar', icon: 'settings', route: '/settings' },
        ];
      case 'Instructor':
        return [
          { label: 'Ana Sayfa', icon: 'home', route: '/', exact: true },
          { label: 'Eğitimlerim', icon: 'school', route: '/instructor/courses' },
          { label: 'Eğitim Aç', icon: 'add_circle', route: '/instructor/courses/new' },
          { label: 'Program', icon: 'calendar_month', route: '/instructor/schedule' },
          { label: 'Profil', icon: 'person', route: '/profile' },
          { label: 'Ayarlar', icon: 'settings', route: '/settings' },
        ];
      case 'Admin':
        return [
          { label: 'Ana Sayfa', icon: 'home', route: '/', exact: true },
          { label: 'Genel Bakış', icon: 'dashboard', route: '/admin/overview' },
          { label: 'Kullanıcılar', icon: 'group', route: '/admin/users' },
          { label: 'Eğitimler', icon: 'school', route: '/admin/courses' },
          { label: 'Kategoriler', icon: 'category', route: '/admin/categories' },
          { label: 'Profil', icon: 'person', route: '/profile' },
          { label: 'Ayarlar', icon: 'settings', route: '/settings' },
        ];
      default:
        return [];
    }
  });

  // Avatar için ad-soyadın baş harfleri
  readonly initials = computed(() => {
    const name = this.auth.currentUser()?.fullName ?? '';
    return name
      .split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  });

  logout(): void {
    this.auth.logout();
  }
}
