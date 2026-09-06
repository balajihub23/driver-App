import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class WindowRefService {
  private platformId = inject(PLATFORM_ID);

  get nativeWindow(): any {
    if (isPlatformBrowser(this.platformId)) {
      return window;
    }
    return {};
  }
}
