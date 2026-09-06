import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class SupportService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private authService = inject(AuthService);
  private readonly baseUrl = environment.serverApi;

  getTickets(): Observable<any> {
    if (!isPlatformBrowser(this.platformId) || !this.authService.getAccessToken()) {
      return of({ success: false, data: [] });
    }
    return this.http.get<any>(`${this.baseUrl}/api/v1/support/tickets`);
  }

  getTicketDetails(id: number): Observable<any> {
    if (!isPlatformBrowser(this.platformId) || !this.authService.getAccessToken()) {
      return of({ success: false, data: null });
    }
    return this.http.get<any>(`${this.baseUrl}/api/v1/support/tickets/${id}`);
  }

  createTicket(category: string, subject: string, description: string, priority: string = 'MEDIUM'): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/api/v1/support/tickets`, {
      category,
      subject,
      description,
      priority
    });
  }

  sendMessage(ticketId: number, message: string, attachmentUrl?: string, attachmentName?: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/api/v1/support/tickets/${ticketId}/messages`, {
      message,
      attachmentUrl,
      attachmentName
    });
  }

  reopenTicket(ticketId: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/api/v1/support/tickets/${ticketId}/reopen`, null);
  }
}
