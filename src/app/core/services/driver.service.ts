import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class DriverService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private authService = inject(AuthService);
  private readonly baseUrl = environment.serverApi;

  getProfile(): Observable<any> {
    if (!isPlatformBrowser(this.platformId) || !this.authService.getAccessToken()) {
      return of({ success: false, data: null });
    }
    return this.http.get<any>(`${this.baseUrl}/api/v1/drivers/me`);
  }

  updateProfile(data: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/api/v1/drivers/me`, data);
  }

  updateLocation(latitude: number, longitude: number, gpsAccuracy: number = 10.0): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/api/v1/drivers/me/location?latitude=${latitude}&longitude=${longitude}&gpsAccuracy=${gpsAccuracy}`, null);
  }

  toggleOnline(isOnline: boolean): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/api/v1/drivers/me/online-status?isOnline=${isOnline}`, null);
  }

  getPreferences(): Observable<any> {
    if (!isPlatformBrowser(this.platformId) || !this.authService.getAccessToken()) {
      return of({ success: false, data: null });
    }
    return this.http.get<any>(`${this.baseUrl}/api/v1/drivers/me/preferences`);
  }

  updatePreferences(data: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/api/v1/drivers/me/preferences`, data);
  }

  getEarningsSummary(): Observable<any> {
    if (!isPlatformBrowser(this.platformId) || !this.authService.getAccessToken()) {
      return of({ success: false, data: null });
    }
    return this.http.get<any>(`${this.baseUrl}/api/v1/drivers/me/earnings`);
  }

  getBankAccount(): Observable<any> {
    if (!isPlatformBrowser(this.platformId) || !this.authService.getAccessToken()) {
      return of({ success: false, data: null });
    }
    return this.http.get<any>(`${this.baseUrl}/api/v1/drivers/me/earnings/bank-account`);
  }

  saveBankAccount(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/api/v1/drivers/me/earnings/bank-account`, data);
  }

  requestWithdrawal(amount: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/api/v1/drivers/me/earnings/withdraw?amount=${amount}`, null);
  }
}
