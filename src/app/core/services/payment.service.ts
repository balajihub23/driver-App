import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface RazorpayOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  bookingNumber?: string;
}

export interface PaymentVerifyPayload {
  bookingId: number;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private readonly baseUrl = environment.serverApi;
  private settingsCache$?: Observable<any>;

  getBookingSettings(): Observable<any> {
    if (!isPlatformBrowser(this.platformId)) {
      return of({ success: false, data: null });
    }
    if (!this.settingsCache$) {
      this.settingsCache$ = this.http.get<any>(`${this.baseUrl}/api/v1/settings/booking`).pipe(
        shareReplay(1)
      );
    }
    return this.settingsCache$;
  }

  createRazorpayOrder(bookingId: number): Observable<{ success: boolean; data?: RazorpayOrderResponse; message?: string }> {
    if (!isPlatformBrowser(this.platformId)) {
      return of({ success: false, message: 'Browser context required' });
    }
    return this.http.post<any>(`${this.baseUrl}/api/v1/payments/create-order`, { bookingId });
  }

  verifyPaymentSignature(payload: PaymentVerifyPayload): Observable<{ success: boolean; data?: string; message?: string }> {
    if (!isPlatformBrowser(this.platformId)) {
      return of({ success: false, message: 'Browser context required' });
    }
    return this.http.post<any>(`${this.baseUrl}/api/v1/payments/verify-signature`, payload);
  }
}
