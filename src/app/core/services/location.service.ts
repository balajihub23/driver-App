import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { PaymentService } from './payment.service';

export interface LocationResult {
  address: string;
  latitude: number;
  longitude: number;
  timestamp?: number;
}

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private paymentService = inject(PaymentService);

  private cachedMapKey: string = '';

  getMapKey(): Observable<string> {
    if (this.cachedMapKey) {
      return of(this.cachedMapKey);
    }
    return this.paymentService.getBookingSettings().pipe(
      map(res => {
        const key = res?.data?.mapKey || '';
        this.cachedMapKey = key;
        return key;
      }),
      catchError(() => of(''))
    );
  }

  saveLocationToStorage(location: LocationResult): void {
    if (isPlatformBrowser(this.platformId)) {
      const dataWithTime = { ...location, timestamp: Date.now() };
      localStorage.setItem('driver_location_address', location.address);
      localStorage.setItem('driver_location_lat', String(location.latitude));
      localStorage.setItem('driver_location_lng', String(location.longitude));
      localStorage.setItem('driver_location_data', JSON.stringify(dataWithTime));
    }
  }

  getStoredLocation(): LocationResult | null {
    if (isPlatformBrowser(this.platformId)) {
      const raw = localStorage.getItem('driver_location_data');
      if (raw) {
        try {
          return JSON.parse(raw);
        } catch (e) {
          // fallback to individual keys
        }
      }
      const address = localStorage.getItem('driver_location_address');
      const lat = localStorage.getItem('driver_location_lat');
      const lng = localStorage.getItem('driver_location_lng');
      if (address && lat && lng) {
        return { address, latitude: Number(lat), longitude: Number(lng) };
      }
    }
    return null;
  }

  autoDetectLocation(): Promise<LocationResult> {
    return new Promise((resolve) => {
      const stored = this.getStoredLocation();
      const defaultResult: LocationResult = stored || {
        address: 'Sector 18, Gurugram',
        latitude: 28.4595,
        longitude: 77.0266
      };

      if (!isPlatformBrowser(this.platformId) || !('geolocation' in navigator)) {
        resolve(defaultResult);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          this.getMapKey().subscribe(async (mapKey) => {
            let address = '';

            // Try Google Maps Geocoding API if key is present
            if (mapKey) {
              try {
                const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${mapKey}`;
                const res = await fetch(geocodeUrl).then(r => r.json());
                if (res.status === 'OK' && res.results && res.results.length > 0) {
                  const formatted = res.results[0].formatted_address;
                  const parts = formatted.split(',');
                  address = parts.length >= 2 ? `${parts[0].trim()}, ${parts[1].trim()}` : formatted;
                }
              } catch (e) {
                console.warn('Google Geocode fetch error, attempting fallback:', e);
              }
            }

            // Fallback to OpenStreetMap Nominatim reverse geocoding if Google address not retrieved
            if (!address) {
              try {
                const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
                const res = await fetch(nominatimUrl, {
                  headers: { 'Accept-Language': 'en' }
                }).then(r => r.json());
                if (res && res.display_name) {
                  const parts = res.display_name.split(',');
                  address = parts.length >= 2 ? `${parts[0].trim()}, ${parts[1].trim()}` : res.display_name;
                }
              } catch (e) {
                console.warn('Nominatim reverse geocode error:', e);
              }
            }

            if (!address) {
              address = `Location (${lat.toFixed(3)}, ${lng.toFixed(3)})`;
            }

            const locationRes: LocationResult = {
              address,
              latitude: lat,
              longitude: lng
            };

            this.saveLocationToStorage(locationRes);
            resolve(locationRes);
          });
        },
        (error) => {
          console.warn('Geolocation error or permission denied:', error);
          resolve(defaultResult);
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    });
  }

  private trackingInterval: any = null;

  startTracking(intervalMs: number = 15000, onUpdate?: (loc: LocationResult) => void): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.stopTracking();

    this.autoDetectLocation().then(loc => {
      if (onUpdate && loc) onUpdate(loc);
    });

    this.trackingInterval = setInterval(() => {
      this.autoDetectLocation().then(loc => {
        if (onUpdate && loc) onUpdate(loc);
      });
    }, intervalMs);
  }

  stopTracking(): void {
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
  }
}
