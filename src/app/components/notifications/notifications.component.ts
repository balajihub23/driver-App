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
        if (res && res.success && res.data) {
          this.notifications = res.data;
        } else {
          this.notifications = [];
        }
      },
      error: () => {
        this.notifications = [];
      }
    });
  }

  getNotificationIcon(type: string): string {
    const t = type ? type.toUpperCase() : '';
    switch (t) {
      case 'BOOKING': return '🚜';
      case 'PAYMENT': return '💰';
      case 'SUPPORT': return '🎧';
      case 'DOCUMENT': return '🪪';
      case 'VEHICLE': return '🚗';
      default: return '🔔';
    }
  }

  onMarkAllRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.forEach(n => n.isRead = true);
      },
      error: () => {
        this.notifications.forEach(n => n.isRead = true);
      }
    });
  }

  onNotificationTap(notification: any): void {
    if (!notification.isRead) {
      notification.isRead = true;
      this.notificationService.markAsRead(notification.id).subscribe();
    }

    const t = notification.notificationType ? notification.notificationType.toUpperCase() : '';
    if (t === 'BOOKING') {
      this.router.navigate(['/jobs']);
    } else if (t === 'PAYMENT') {
      this.router.navigate(['/earnings']);
    } else if (t === 'VEHICLE' || t === 'DOCUMENT') {
      this.router.navigate(['/profile']);
    } else if (t === 'SUPPORT') {
      const ticketId = notification.ticketId || notification.targetId;
      if (ticketId) {
        this.router.navigate(['/support'], { queryParams: { ticketId } });
      } else {
        this.router.navigate(['/support']);
      }
    }
  }
}
