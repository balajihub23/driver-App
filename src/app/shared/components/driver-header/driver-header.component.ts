import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { NotificationService } from '../../../core/services/notification.service';
import { ThemeService } from '../../../core/services/theme.service';
import { AuthService } from '../../../core/services/auth.service';
import { LogoutModalComponent } from '../logout-modal/logout-modal.component';

@Component({
  selector: 'app-driver-header',
  standalone: true,
  imports: [CommonModule, RouterModule, LogoutModalComponent],
  templateUrl: './driver-header.component.html',
  styleUrl: './driver-header.component.scss'
})
export class DriverHeaderComponent {
  @Input() driverName: string = '';
  @Input() locationName: string = '';
  @Input() isOnline: boolean = false;
  @Input() isPendingVerification: boolean = false;
  @Output() onlineToggle = new EventEmitter<boolean>();

  notificationService = inject(NotificationService);
  themeService = inject(ThemeService);
  authService = inject(AuthService);
  router = inject(Router);

  showLogoutModal: boolean = false;

  onLogout(): void {
    this.showLogoutModal = true;
  }

  cancelLogout(): void {
    this.showLogoutModal = false;
  }

  confirmLogout(): void {
    this.showLogoutModal = false;
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/auth']),
      error: () => {
        this.authService.clearSession();
        this.router.navigate(['/auth']);
      }
    });
  }

  onToggleOnline(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (this.isPendingVerification) {
      input.checked = false;
      return;
    }
    const checked = input.checked;
    this.onlineToggle.emit(checked);
  }

  toggleTheme(): void {
    const current = this.themeService.themeMode();
    if (current === 'LIGHT') this.themeService.setThemeMode('DARK');
    else if (current === 'DARK') this.themeService.setThemeMode('SYSTEM');
    else this.themeService.setThemeMode('LIGHT');
  }
}
