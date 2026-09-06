import { HttpInterceptorFn, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { catchError, of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  
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
      if (error.status === 401) {
        return of(new HttpResponse({
          status: 200,
          body: { success: false, status: 401, message: 'Unauthorized request: please log in.', data: null }
        }));
      }
      return throwError(() => error);
    })
  );
};
