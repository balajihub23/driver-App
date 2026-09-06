import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private authService = inject(AuthService);
  private readonly baseUrl = environment.serverApi;

  unreadCount = signal<number>(0);

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
