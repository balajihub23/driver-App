import { Component, OnInit, Output, EventEmitter, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DriverService } from '../../core/services/driver.service';

@Component({
  selector: 'app-splash',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './splash.component.html',
  styleUrls: ['./splash.component.scss']
})
export class SplashComponent implements OnInit {
  @Output() finish = new EventEmitter<void>();
  @Output() navigateAuth = new EventEmitter<'LOGIN' | 'REGISTER'>();

  router = inject(Router);
  authService = inject(AuthService);
  driverService = inject(DriverService);
  platformId = inject(PLATFORM_ID);

  showInitialSplash: boolean = true;
  progress: number = 0;
  loadingText: string = 'Initializing Rentron...';

  activeSlideIndex: number = 0;

  slides = [
    {
      title: 'More Jobs. More Earnings.',
      description: 'Find work opportunities for your JCB, excavator, crane, or construction vehicle.',
      image: 'assets/images/jcb_onboarding.png'
    },
    {
      title: 'Drive. Earn. Repeat.',
      description: 'Accept cab rides and earn on your schedule.',
      image: 'assets/images/cab_onboarding.png'
    },
    {
      title: 'Ride. Move. Earn.',
      description: 'Accept bike taxi requests and make every trip count.',
      image: 'assets/images/bike_onboarding.png'
    }
  ];

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // 1. If user is already logged in, check profile status and redirect immediately
    const token = this.authService.getAccessToken();
    if (token) {
      this.checkDriverProfileAndNavigate();
      return;
    }

    // 2. If user is not logged in but has visited splash before, show role choice screen directly
    const hasSeenSplash = localStorage.getItem('hasSeenSplash');
    if (hasSeenSplash === 'true') {
      this.showInitialSplash = false;
      this.activeSlideIndex = 3;
      return;
    }

    // 3. Otherwise (First time visit ever), display the initial splash & tutorial slides
    this.startProgress();
  }

  private checkDriverProfileAndNavigate(): void {
    this.driverService.getProfile().subscribe({
      next: (res) => {
        const profile = res?.data || res;
        if (profile) {
          if (profile.operationType && isPlatformBrowser(this.platformId)) {
            localStorage.setItem('operationType', profile.operationType);
          }
          if (profile.selectedRole && isPlatformBrowser(this.platformId)) {
            localStorage.setItem('selectedRole', profile.selectedRole);
          }
        }
        const status = (profile?.status || '').toUpperCase();
        const vStatus = (profile?.verificationStatus || '').toUpperCase();
        const hasSubmittedDetails = profile && (profile.operationType != null || profile.city != null || profile.licenseNumber != null);

        const isAlreadyOnboarded = profile && status !== 'DRAFT' && status !== 'INCOMPLETE' && status !== 'NEW' && (
          status === 'ACTIVE' || 
          status === 'VERIFIED' || 
          status === 'APPROVED' || 
          vStatus === 'VERIFIED' || 
          vStatus === 'APPROVED' || 
          (status === 'PENDING_VERIFICATION' && hasSubmittedDetails)
        );

        if (isAlreadyOnboarded) {
          this.router.navigate(['/dashboard']);
        } else {
          this.router.navigate(['/onboarding']);
        }
      },
      error: () => {
        this.router.navigate(['/onboarding']);
      }
    });
  }

  startProgress(): void {
    const interval = setInterval(() => {
      if (this.progress < 100) {
        this.progress += 4;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          this.showInitialSplash = false;
        }, 300);
      }
    }, 40);
  }

  nextSlide(): void {
    if (this.activeSlideIndex < 3) {
      this.activeSlideIndex++;
    }
  }

  skipSlides(): void {
    this.showInitialSplash = false;
    this.activeSlideIndex = 3;
  }

  onSelectAction(action: 'LOGIN' | 'REGISTER'): void {
    if (action === 'LOGIN') {
      this.markSplashAsSeenAndNavigate('/auth');
    } else {
      this.markSplashAsSeenAndNavigate('/onboarding');
    }
  }

  selectedRole: 'DRIVER' | 'FLEET_OWNER' = 'DRIVER';

  selectRole(role: 'DRIVER' | 'FLEET_OWNER'): void {
    this.selectedRole = role;
  }

  onConfirmRole(): void {
    if (!this.selectedRole) return;
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('selectedRole', this.selectedRole);
      if (this.selectedRole === 'FLEET_OWNER') {
        localStorage.setItem('operationType', 'FLEET');
      } else {
        localStorage.setItem('operationType', 'OWN');
      }
    }
    this.markSplashAsSeenAndNavigate('/auth');
  }

  private markSplashAsSeenAndNavigate(targetRoute: string): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('hasSeenSplash', 'true');
    }
    this.router.navigate([targetRoute]);
  }
}
