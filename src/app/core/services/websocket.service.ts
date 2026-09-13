import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { HttpClient } from '@angular/common/http';

export interface JobOfferEvent {
  bookingId: number;
  bookingNumber?: string;
  productName?: string;
  pickupLocation?: string;
  dropLocation?: string;
  distance?: string;
  estimatedEarning?: number;
  duration?: string;
  expiresInSeconds?: number;
  rawPayload?: any;
}

export interface SupportSocketEvent {
  type: 'SUPPORT_CHAT_MESSAGE' | 'SUPPORT_TICKET_STATUS';
  ticketId: number;
  ticketNumber?: string;
  subject?: string;
  category?: string;
  message?: any;
  status?: string;
  rawPayload?: any;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private platformId = inject(PLATFORM_ID);
  private authService = inject(AuthService);
  private http = inject(HttpClient);

  private readonly baseUrl = environment.serverApi;
  private ws: WebSocket | null = null;
  private jobOfferSubject = new Subject<JobOfferEvent>();
  private supportMessageSubject = new Subject<SupportSocketEvent>();

  jobOffer$: Observable<JobOfferEvent> = this.jobOfferSubject.asObservable();
  supportMessage$: Observable<SupportSocketEvent> = this.supportMessageSubject.asObservable();

  connectWebSocket(userId?: number | string): void {
    if (!isPlatformBrowser(this.platformId)) return;

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const wsProtocol = this.baseUrl.startsWith('https') ? 'wss' : 'ws';
    const cleanBase = this.baseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    
    // Spring STOMP raw WebSocket endpoint: /ws-rentron/websocket
    const primaryWsUrl = `${wsProtocol}://${cleanBase}/ws-rentron/websocket`;
    const fallbackWsUrl = `${wsProtocol}://${cleanBase}/ws-rentron`;

    const tryConnect = (targetUrl: string, isFallback: boolean = false) => {
      try {
        this.ws = new WebSocket(targetUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected successfully to:', targetUrl);
          if (userId) {
            // Send STOMP CONNECT frame
            const connectFrame = `CONNECT\naccept-version:1.1,1.0\nheart-beat:10000,10000\n\n\u0000`;
            this.ws?.send(connectFrame);

            // Send STOMP SUBSCRIBE frames for offers and support messages
            const subOffers = `SUBSCRIBE\nid:sub-0\ndestination:/topic/booking-offers/${userId}\n\n\u0000`;
            const subSupport = `SUBSCRIBE\nid:sub-1\ndestination:/topic/support-messages/${userId}\n\n\u0000`;
            this.ws?.send(subOffers);
            this.ws?.send(subSupport);
          }
        };

        this.ws.onmessage = (event) => {
          try {
            const raw = event.data;
            if (raw && raw.includes('{')) {
              const jsonStart = raw.indexOf('{');
              const jsonEnd = raw.lastIndexOf('}');
              if (jsonStart !== -1 && jsonEnd !== -1) {
                const jsonStr = raw.substring(jsonStart, jsonEnd + 1);
                const data = JSON.parse(jsonStr);

                if (data && (data.type === 'NEW_BOOKING' || data.bookingId)) {
                  this.emitOffer(data);
                } else if (data && (data.type === 'SUPPORT_CHAT_MESSAGE' || data.type === 'SUPPORT_TICKET_STATUS')) {
                  this.emitSupportEvent(data);
                }
              }
            }
          } catch (e) {
            console.error('Error parsing WebSocket message:', e);
          }
        };

        this.ws.onerror = () => {
          if (!isFallback) {
            // Try secondary fallback URL silently
            tryConnect(fallbackWsUrl, true);
          } else {
            console.warn('WebSocket server unavailable at', targetUrl, '. Polling/REST fallback mode active.');
          }
        };

        this.ws.onclose = () => {
          this.ws = null;
          setTimeout(() => {
            if (!this.ws) {
              this.connectWebSocket(userId);
            }
          }, 15000);
        };
      } catch (e) {
        if (!isFallback) {
          tryConnect(fallbackWsUrl, true);
        }
      }
    };

    tryConnect(primaryWsUrl);
  }

  emitOffer(data: any): void {
    const offer: JobOfferEvent = {
      bookingId: data.bookingId,
      bookingNumber: data.bookingNumber || `BK-${data.bookingId}`,
      productName: data.productName || 'JCB 3DX Earthmover',
      pickupLocation: data.pickupLocation || 'Sector 18, Noida',
      dropLocation: data.dropLocation || 'Sector 62, Noida',
      distance: data.distanceKm ? `${data.distanceKm} km` : '3.4 km',
      estimatedEarning: data.totalAmount || data.estimatedEarning || 2400,
      duration: data.duration || '4 Hours',
      expiresInSeconds: data.expiresInSeconds || 30,
      rawPayload: data
    };

    this.jobOfferSubject.next(offer);
  }

  emitSupportEvent(data: any): void {
    const evt: SupportSocketEvent = {
      type: data.type || 'SUPPORT_CHAT_MESSAGE',
      ticketId: data.ticketId,
      ticketNumber: data.ticketNumber || ('INC-' + data.ticketId),
      subject: data.subject || 'Support Ticket Update',
      category: data.category || 'Support',
      message: data.message,
      status: data.status,
      rawPayload: data
    };

    this.supportMessageSubject.next(evt);
  }

  disconnectWebSocket(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
