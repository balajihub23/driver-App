import { Injectable, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private readonly baseUrl = environment.serverApi;
  private readonly appKey = environment.mobileAppKey;

  currentUser = signal<any>(null);
  isLoggedIn = signal<boolean>(false);

  constructor() {
    this.checkSession();
  }

  private checkSession(): void {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('accessToken');
      const userRaw = localStorage.getItem('userData');
      if (token && userRaw) {
        try {
          const userObj = JSON.parse(userRaw);
          this.currentUser.set(userObj);
          this.isLoggedIn.set(true);
          this.registerDeviceToken(userObj?.id);
        } catch {
          this.clearSession();
        }
      }
    }
  }

  sendOtp(phone: string, purpose: string = 'LOGIN'): Observable<any> {
    const headers = { 'X-Client-App-Key': this.appKey };
    return this.http.post<any>(`${this.baseUrl}/api/v1/auth/send-otp`, { phone, purpose }, { headers });
  }

  verifyOtp(phone: string, otpCode: string, purpose: string = 'LOGIN'): Observable<any> {
    const headers = { 'X-Client-App-Key': this.appKey };
    return this.http.post<any>(`${this.baseUrl}/api/v1/auth/verify-otp`, { phone, otpCode, purpose }, { headers }).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.setSession(res.data);
        }
      })
    );
  }

  loginWithPhoneOtp(phone: string, otp: string): Observable<any> {
    const headers = { 'X-Client-App-Key': this.appKey };
    const payload = {
      loginType: 'PHONE_OTP',
      phone,
      otp,
      deviceType: 'MOBILE'
    };
    return this.http.post<any>(`${this.baseUrl}/api/v1/auth/login`, payload, { headers }).pipe(
      tap(res => {
        if (res.success && res.data) {
          this.setSession(res.data);
        }
      })
    );
  }

  registerDriverPartner(payload: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/api/v1/partners`, { ...payload, partnerType: 'DRIVER' });
  }

  logout(): Observable<any> {
    const refreshToken = this.getRefreshToken();
    return this.http.post<any>(`${this.baseUrl}/api/v1/auth/logout`, { refreshToken }).pipe(
      tap({
        next: () => this.clearSession(),
        error: () => this.clearSession()
      })
    );
  }

  private setSession(authData: any): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('accessToken', authData.accessToken);
      localStorage.setItem('refreshToken', authData.refreshToken);
      localStorage.setItem('userRole', authData.role);
      localStorage.setItem('userData', JSON.stringify(authData.user));
    }
    this.currentUser.set(authData.user);
    this.isLoggedIn.set(true);
    this.registerDeviceToken(authData?.user?.id);
  }

  clearSession(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.clear();
    }
    this.currentUser.set(null);
    this.isLoggedIn.set(false);
  }

  getAccessToken(): string | null {
    return isPlatformBrowser(this.platformId) ? localStorage.getItem('accessToken') : null;
  }

  getRefreshToken(): string | null {
    return isPlatformBrowser(this.platformId) ? localStorage.getItem('refreshToken') : null;
  }

  registerDeviceToken(userId?: number): void {
    if (!isPlatformBrowser(this.platformId)) return;
    let did = localStorage.getItem('rentron_driver_device_id');
    if (!did) {
      did = 'drv_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now();
      localStorage.setItem('rentron_driver_device_id', did);
    }
    const token = 'fcm_drv_' + did;
    const body: any = {
      deviceToken: token,
      platform: 'ANDROID',
      deviceId: did
    };
    if (userId) body.userId = String(userId);

    this.http.post<any>(`${this.baseUrl}/api/v1/notifications/devices/register`, body).subscribe({
      next: (res) => console.log('Driver device token registered for push:', res),
      error: (err) => console.warn('Driver device token registration error:', err)
    });
  }

}