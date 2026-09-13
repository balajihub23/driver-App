import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface ActiveSupportBanner {
  ticketId: number;
  ticketNumber: string;
  subject?: string;
  latestMessage: string;
  count: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private authService = inject(AuthService);
  private readonly baseUrl = environment.serverApi;

  unreadCount = signal<number>(0);
  activeSupportNotification = signal<ActiveSupportBanner | null>(null);

  getInbox(): Observable<any> {
    if (!isPlatformBrowser(this.platformId) || !this.authService.getAccessToken()) {
      return of({ success: false, data: [] });
    }
    return this.http.get<any>(`${this.baseUrl}/api/v1/notifications/inbox`);
  }

  refreshUnreadCount(): void {
    if (!isPlatformBrowser(this.platformId) || !this.authService.getAccessToken()) {
      return;
    }
    this.http.get<any>(`${this.baseUrl}/api/v1/notifications/unread-count`).subscribe({
      next: (res) => {
        if (res.success) {
          this.unreadCount.set(res.data || 0);
        }
      },
      error: () => {}
    });
  }

  showSupportBanner(ticketId: number, ticketNumber: string, messageText: string, subject?: string): void {
    const current = this.activeSupportNotification();
    if (current && current.ticketId === ticketId) {
      // Update existing notification with new message & increment counter!
      this.activeSupportNotification.set({
        ticketId,
        ticketNumber: ticketNumber || current.ticketNumber,
        subject: subject || current.subject,
        latestMessage: messageText,
        count: current.count + 1
      });
    } else {
      this.activeSupportNotification.set({
        ticketId,
        ticketNumber: ticketNumber || ('INC-' + ticketId),
        subject: subject || 'Support Update',
        latestMessage: messageText,
        count: 1
      });
    }
  }

  dismissSupportBanner(): void {
    this.activeSupportNotification.set(null);
  }

  markAsRead(id: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/api/v1/notifications/mark-read/${id}`, null).pipe(
      tap(() => this.refreshUnreadCount())
    );
  }

  markAllAsRead(): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/api/v1/notifications/mark-all-read`, null).pipe(
      tap(() => this.unreadCount.set(0))
    );
  }

  registerDeviceToken(deviceToken: string, platform: string = 'WEB'): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/api/v1/notifications/devices/register?deviceToken=${encodeURIComponent(deviceToken)}&platform=${platform}`, null);
  }
}
