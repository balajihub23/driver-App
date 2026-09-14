import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
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

  getProfile(phone?: string): Observable<any> {
    if (!isPlatformBrowser(this.platformId)) {
      return of({ success: false, data: null });
    }
    const token = this.authService.getAccessToken();
    if (!token && phone) {
      return this.http.get<any>(`${this.baseUrl}/api/v1/partners?type=DRIVER`).pipe(
        map(res => {
          if (res && res.success && res.data) {
            const list = res.data.drivers || res.data.approvals || [];
            const cleanTarget = phone.replace(/[^0-9]/g, '').slice(-10);
            const found = list.find((d: any) => d.phone && d.phone.replace(/[^0-9]/g, '').endsWith(cleanTarget));
            if (found) return { success: true, data: found };
          }
          return { success: false, data: null };
        }),
        catchError(() => of({ success: false, data: null }))
      );
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

  getBankAccounts(): Observable<any> {
    if (!isPlatformBrowser(this.platformId) || !this.authService.getAccessToken()) {
      return of({ success: false, data: null });
    }
    return this.http.get<any>(`${this.baseUrl}/api/v1/drivers/me/earnings/bank-accounts`);
  }

  saveBankAccount(data: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/api/v1/drivers/me/earnings/bank-accounts`, data);
  }

  deleteBankAccount(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/api/v1/drivers/me/earnings/bank-accounts/${id}`);
  }

  setPrimaryBankAccount(id: number): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/api/v1/drivers/me/earnings/bank-accounts/${id}/primary`, null);
  }

  requestWithdrawal(amount: number, bankAccountId?: number | null): Observable<any> {
    let url = `${this.baseUrl}/api/v1/drivers/me/earnings/withdraw?amount=${amount}`;
    if (bankAccountId) {
      url += `&bankAccountId=${bankAccountId}`;
    }
    return this.http.post<any>(url, null);
  }
}
