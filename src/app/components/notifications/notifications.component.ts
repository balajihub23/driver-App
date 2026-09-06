import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { BottomNavigationComponent } from '../../shared/components/bottom-navigation/bottom-navigation.component';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterModule, BottomNavigationComponent],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss'
})
export class NotificationsComponent implements OnInit {
  notificationService = inject(NotificationService);
  router = inject(Router);

  notifications: any[] = [];

  ngOnInit(): void {
    this.loadInbox();
  }

  loadInbox(): void {
    this.notificationService.getInbox().subscribe({
      next: (res) => {
        if (res.success && res.data && res.data.length > 0) {
          this.notifications = res.data;
        }
      }
    });
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'BOOKING': return '🚜';
      case 'PAYMENT': return '💰';
      case 'SUPPORT': return '🎧';
      case 'DOCUMENT': return '🪪';
      default: return '🔔';
    }
  }

  onMarkAllRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.forEach(n => n.isRead = true);
      }
    });
  }

  onNotificationTap(notification: any): void {
    if (!notification.isRead) {
      notification.isRead = true;
      this.notificationService.markAsRead(notification.id).subscribe();
    }

    if (notification.notificationType === 'BOOKING') this.router.navigate(['/jobs']);
    else if (notification.notificationType === 'PAYMENT') this.router.navigate(['/earnings']);
    else if (notification.notificationType === 'SUPPORT') this.router.navigate(['/support']);
  }
}
