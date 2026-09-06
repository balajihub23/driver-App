import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subject, Observable, of } from 'rxjs';
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

  jobOffer$: Observable<JobOfferEvent> = this.jobOfferSubject.asObservable();

  connectWebSocket(userId?: number | string): void {
    if (!isPlatformBrowser(this.platformId)) return;

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const wsProtocol = this.baseUrl.startsWith('https') ? 'wss' : 'ws';
    const cleanBase = this.baseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    
    // Clean Spring STOMP endpoint registered via registry.addEndpoint("/ws-rentron")
    const wsUrl = `${wsProtocol}://${cleanBase}/ws-rentron`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected successfully to:', wsUrl);
        if (userId) {
          // Send STOMP SUBSCRIBE frame
          const subscribeFrame = `SUBSCRIBE\nid:sub-0\ndestination:/topic/booking-offers/${userId}\n\n\u0000`;
          this.ws?.send(subscribeFrame);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const raw = event.data;
          // Parse STOMP frame or raw JSON message payload
          if (raw && raw.includes('{')) {
            const jsonStart = raw.indexOf('{');
            const jsonEnd = raw.lastIndexOf('}');
            if (jsonStart !== -1 && jsonEnd !== -1) {
              const jsonStr = raw.substring(jsonStart, jsonEnd + 1);
              const data = JSON.parse(jsonStr);

              if (data && (data.type === 'NEW_BOOKING' || data.bookingId)) {
                this.emitOffer(data);
              }
            }
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('WebSocket server unavailable at', wsUrl, '. Ensure backend (rentron) is running on port 8080.');
      };

      this.ws.onclose = () => {
        this.ws = null;
        // Schedule single reconnect attempt in 15 seconds if server is temporarily offline
        setTimeout(() => {
          if (!this.ws) {
            this.connectWebSocket(userId);
          }
        }, 15000);
      };
    } catch (e) {
      console.warn('Could not initialize WebSocket connection:', e);
    }
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

  disconnectWebSocket(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
