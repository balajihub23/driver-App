import { HttpInterceptorFn, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { catchError, of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  const router = inject(Router);
  
  if (!isPlatformBrowser(platformId)) {
    return next(req).pipe(
      catchError((error: HttpErrorResponse) => {
        return of(new HttpResponse({
          status: 200,
          body: { success: false, status: error.status || 401, message: error.message, data: null }
        }));
      })
    );
  }

  if (req.url.startsWith('https://maps.googleapis.com') || req.url.includes('openstreetmap.org')) {
    return next(req);
  }

  const token = localStorage.getItem('accessToken');
  let headers = req.headers.set('X-Client-App-Key', environment.mobileAppKey);

  if (token) {
    headers = headers.set('Authorization', `Bearer ${token}`);
  }

  const cloned = req.clone({ headers });
  return next(cloned).pipe(
    catchError((error: HttpErrorResponse) => {
      // Do not intercept or overwrite public auth endpoint errors (/api/v1/auth/)
      if (req.url.includes('/api/v1/auth/')) {
        return throwError(() => error);
      }

      if (error.status === 401) {
        if (typeof window !== 'undefined' && !router.url.includes('/service-error') && !router.url.includes('/auth')) {
          router.navigate(['/service-error'], { queryParams: { code: '401', title: 'Unauthorized Session', message: error.error?.message || 'Unauthorized request: please log in.' } });
        }
        return of(new HttpResponse({
          status: 200,
          body: { success: false, status: 401, message: error.error?.message || 'Unauthorized request: please log in.', data: null }
        }));
      }

      if (error.status === 503 || error.status === 0) {
        if (typeof window !== 'undefined' && !router.url.includes('/service-error')) {
          router.navigate(['/service-error'], { queryParams: { code: '503', title: 'Service Down', message: 'Rentron backend service is currently offline or unreachable.' } });
        }
      }

      return throwError(() => error);
    })
  );
};
