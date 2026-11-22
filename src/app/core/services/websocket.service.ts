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

export interface LifecycleSocketEvent {
  bookingId: number;
  status: string;
  event: string;
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
  private lifecycleSubject = new Subject<LifecycleSocketEvent>();

  jobOffer$: Observable<JobOfferEvent> = this.jobOfferSubject.asObservable();
  supportMessage$: Observable<SupportSocketEvent> = this.supportMessageSubject.asObservable();
  lifecycleEvent$: Observable<LifecycleSocketEvent> = this.lifecycleSubject.asObservable();
  private authOtpSubject = new Subject<any>();
  authOtp$: Observable<any> = this.authOtpSubject.asObservable();

  private currentUserId?: number | string;
  private currentDriverId?: number | string;
  private subscribedDestinations = new Set<string>();

  connectWebSocket(userId?: number | string, driverId?: number | string): void {
    if (!isPlatformBrowser(this.platformId)) return;

    if (userId) this.currentUserId = userId;
    if (driverId) this.currentDriverId = driverId;

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.resubscribeTopics();
      return;
    }
    if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
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
          console.log('[WebSocket] Connected successfully to:', targetUrl);
          this.subscribedDestinations.clear();
          const token = this.authService.getAccessToken();
          const authHeaders = token
            ? `Authorization:Bearer ${token}\ntoken:${token}\n`
            : '';

          // Send STOMP CONNECT frame with auth tokens
          const connectFrame = `CONNECT\naccept-version:1.1,1.0\nheart-beat:10000,10000\n${authHeaders}\n\u0000`;
          this.ws?.send(connectFrame);

          this.resubscribeTopics();
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
                const payload = data.payload || data;

                if (data && (data.type === 'AUTH_OTP' || data.eventType === 'AUTH_OTP')) {
                  this.authOtpSubject.next(data);
                } else if (data && (data.type === 'NEW_BOOKING' || data.type === 'NEW_BOOKING_OFFER' || data.eventType === 'DRIVER_OFFER' || data.type === 'SCHEDULED_RIDE_ALERT' || data.eventType === 'SCHEDULED_RIDE_ALERT' || payload.type === 'SCHEDULED_RIDE_ALERT' || payload.type === 'NEW_BOOKING' || payload.type === 'NEW_BOOKING_OFFER' || (payload.bookingId && !payload.status))) {
                  console.log('[WebSocket] Job offer received:', payload);
                  this.emitOffer(payload);
                } else if (data && (data.type === 'SUPPORT_CHAT_MESSAGE' || data.type === 'SUPPORT_TICKET_STATUS')) {
                  this.emitSupportEvent(data);
                } else if (data && (data.status || data.event || data.type === 'BOOKING_ALREADY_ASSIGNED' || payload.status || payload.event)) {
                  this.emitLifecycleEvent(payload);
                }
              }
            }
          } catch (e) {
            console.error('[WebSocket] Error parsing message:', e);
          }
        };

        this.ws.onerror = () => {
          if (!isFallback) {
            tryConnect(fallbackWsUrl, true);
          } else {
            console.warn('[WebSocket] Unavailable at', targetUrl, '. Polling/REST fallback mode active.');
          }
        };

        this.ws.onclose = () => {
          this.ws = null;
          this.subscribedDestinations.clear();
          setTimeout(() => {
            if (!this.ws) {
              this.connectWebSocket(this.currentUserId, this.currentDriverId);
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

  private subscribeToDestination(destination: string, id: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    if (this.subscribedDestinations.has(destination)) return;
    this.subscribedDestinations.add(destination);
    const subFrame = `SUBSCRIBE\nid:${id}\ndestination:${destination}\n\n\u0000`;
    this.ws.send(subFrame);
  }

  private resubscribeTopics(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    this.subscribeToDestination('/topic/auth-otp', 'sub-auth-otp');
    this.subscribeToDestination('/topic/booking-offers', 'sub-offers-broadcast');
    this.subscribeToDestination('/topic/bookings/events', 'sub-bookings-events');

    if (this.currentUserId) {
      this.subscribeToDestination(`/topic/booking-offers/${this.currentUserId}`, `sub-offers-u-${this.currentUserId}`);
      this.subscribeToDestination(`/topic/support-messages/${this.currentUserId}`, `sub-support-u-${this.currentUserId}`);
      this.subscribeToDestination(`/topic/user-events/${this.currentUserId}`, `sub-events-u-${this.currentUserId}`);
      this.subscribeToDestination('/queue/booking-offers', 'sub-queue-offers');
      this.subscribeToDestination('/user/queue/booking-offers', 'sub-user-queue-offers');
    }

    if (this.currentDriverId && String(this.currentDriverId) !== String(this.currentUserId)) {
      this.subscribeToDestination(`/topic/booking-offers/${this.currentDriverId}`, `sub-offers-d-${this.currentDriverId}`);
      this.subscribeToDestination(`/topic/user-events/${this.currentDriverId}`, `sub-events-d-${this.currentDriverId}`);
    }
  }

  subscribeToBooking(bookingId: number): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.subscribeToDestination(`/topic/booking/${bookingId}`, `sub-booking-${bookingId}`);
    }
  }

  emitOffer(data: any): void {
    const offer: JobOfferEvent = {
      bookingId: data.bookingId,
      bookingNumber: data.bookingNumber || `BK-${data.bookingId}`,
      productName: data.productName || (data.vehicleType ? `${data.vehicleType} Vehicle` : 'Rentron Ride'),
      pickupLocation: data.pickupAddress || data.pickupLocation || 'Nearby Pickup Location',
      dropLocation: data.destinationAddress || data.dropLocation || 'Destination',
      distance: data.distanceKm ? `${data.distanceKm} km` : (data.distance || 'Near you'),
      estimatedEarning: data.driverAmount || data.totalAmount || data.estimatedEarning || 0,
      duration: data.estimatedDurationMinutes ? `${data.estimatedDurationMinutes} mins` : (data.duration || 'Standard'),
      expiresInSeconds: data.expiresInSeconds || 30,
      rawPayload: data
    };

    this.jobOfferSubject.next(offer);
  }

  emitLifecycleEvent(data: any): void {
    const evt: LifecycleSocketEvent = {
      bookingId: data.bookingId,
      status: data.status,
      event: data.event || data.type || '',
      rawPayload: data
    };
    this.lifecycleSubject.next(evt);
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
      this.subscribedDestinations.clear();
    }
  }
}
