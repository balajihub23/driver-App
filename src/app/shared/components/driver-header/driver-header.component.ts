import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NotificationService } from '../../../core/services/notification.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-driver-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './driver-header.component.html',
  styleUrl: './driver-header.component.scss'
})
export class DriverHeaderComponent {
  @Input() driverName: string = '';
  @Input() locationName: string = '';
  @Input() isOnline: boolean = false;
  @Output() onlineToggle = new EventEmitter<boolean>();

  notificationService = inject(NotificationService);
  themeService = inject(ThemeService);

  onToggleOnline(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.onlineToggle.emit(checked);
  }

  toggleTheme(): void {
    const current = this.themeService.themeMode();
    if (current === 'LIGHT') this.themeService.setThemeMode('DARK');
    else if (current === 'DARK') this.themeService.setThemeMode('SYSTEM');
    else this.themeService.setThemeMode('LIGHT');
  }
}
