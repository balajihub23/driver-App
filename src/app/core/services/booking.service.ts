import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class BookingService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private authService = inject(AuthService);
  private readonly baseUrl = environment.serverApi;

  getBookings(): Observable<any> {
    if (!isPlatformBrowser(this.platformId) || !this.authService.getAccessToken()) {
      return of({ success: false, data: [] });
    }
    return this.http.get<any>(`${this.baseUrl}/api/v1/bookings`);
  }

  getBookingById(id: number): Observable<any> {
    if (!isPlatformBrowser(this.platformId) || !this.authService.getAccessToken()) {
      return of({ success: false, data: null });
    }
    return this.http.get<any>(`${this.baseUrl}/api/v1/bookings/${id}`);
  }

  getMyOffers(): Observable<any> {
    if (!isPlatformBrowser(this.platformId) || !this.authService.getAccessToken()) {
      return of({ success: false, data: [] });
    }
    return this.http.get<any>(`${this.baseUrl}/api/v1/drivers/me/offers`);
  }

  acceptOffer(bookingId: number, _driverId?: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/api/v1/drivers/me/offers/${bookingId}/accept`, null);
  }

  rejectOffer(bookingId: number, reason?: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/api/v1/drivers/me/offers/${bookingId}/reject`, { reason });
  }

  getActiveJob(): Observable<any> {
    if (!isPlatformBrowser(this.platformId) || !this.authService.getAccessToken()) {
      return of({ success: false, data: null });
    }
    return this.http.get<any>(`${this.baseUrl}/api/v1/drivers/me/active-job`);
  }

  markArriving(bookingId: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/api/v1/drivers/me/bookings/${bookingId}/arriving`, null);
  }

  markArrived(bookingId: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/api/v1/drivers/me/bookings/${bookingId}/arrived`, null);
  }

  verifyOtp(bookingId: number, otp: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/api/v1/drivers/me/bookings/${bookingId}/verify-otp`, { otp });
  }

  startRide(bookingId: number, otp: string): Observable<any> {
    return this.verifyOtp(bookingId, otp);
  }

  getBookingSettings(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/api/v1/settings/booking`);
  }

  confirmCashPayment(bookingId: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/api/v1/payments/cash-received`, { bookingId });
  }

  verifyPaymentSignature(payload: {
    bookingId: number | string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/api/v1/payments/verify-signature`, payload);
  }

  completeJob(bookingId: number, finalFare?: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/api/v1/drivers/me/bookings/${bookingId}/complete`, { finalFare });
  }

  uploadProof(bookingId: number, photoUrl: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/api/v1/drivers/me/bookings/${bookingId}/proof`, { photoUrl });
  }

  getMyJobHistory(): Observable<any> {
    if (!isPlatformBrowser(this.platformId) || !this.authService.getAccessToken()) {
      return of({ success: false, data: [] });
    }
    return this.http.get<any>(`${this.baseUrl}/api/v1/drivers/me/job-history`);
  }

  updateStatus(bookingId: number, newStatus: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/api/v1/bookings/${bookingId}/status?newStatus=${newStatus}`, null);
  }
}
