import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { DriverService } from '../services/driver.service';
import { map, catchError, of } from 'rxjs';

export const verificationGuard: CanActivateFn = () => {
  const driverService = inject(DriverService);
  const router = inject(Router);

  return driverService.getProfile().pipe(
    map((res) => {
      const profile = (res && res.success && res.data) ? res.data : (res && res.phone ? res : null);
      if (profile && (profile.status || '').toUpperCase() === 'PENDING_VERIFICATION') {
        router.navigate(['/dashboard']);
        return false;
      }
      return true;
    }),
    catchError(() => of(true))
  );
};
