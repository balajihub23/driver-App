import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { DriverHeaderComponent } from '../../shared/components/driver-header/driver-header.component';
import { BottomNavigationComponent } from '../../shared/components/bottom-navigation/bottom-navigation.component';
import { BookingOfferModalComponent } from '../../shared/components/booking-offer-modal/booking-offer-modal.component';
import { NavigationModalComponent } from '../../shared/components/navigation-modal/navigation-modal.component';
import { DriverService } from '../../core/services/driver.service';
import { BookingService } from '../../core/services/booking.service';
import { LocationService } from '../../core/services/location.service';
import { WebSocketService, JobOfferEvent, LifecycleSocketEvent } from '../../core/services/websocket.service';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';
import { LogoutModalComponent } from '../../shared/components/logout-modal/logout-modal.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    DriverHeaderComponent,
    BottomNavigationComponent,
    BookingOfferModalComponent,
    NavigationModalComponent,
    LogoutModalComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
  driverService = inject(DriverService);
  bookingService = inject(BookingService);
  locationService = inject(LocationService);
  webSocketService = inject(WebSocketService);
  notificationService = inject(NotificationService);
  authService = inject(AuthService);
  router = inject(Router);
  http = inject(HttpClient);

  hasCompletedVehicleDetails: boolean = true;

  goToVehicleRcUpload(): void {
    this.router.navigate(['/profile'], { queryParams: { tab: 'vehicles', action: 'upload_rc' } });
  }

  showLogoutModal: boolean = false;

  onLogout(): void {
    this.showLogoutModal = true;
  }

  cancelLogout(): void {
    this.showLogoutModal = false;
  }

  confirmLogout(): void {
    this.showLogoutModal = false;
    this.locationService.stopTracking();
    this.webSocketService.disconnectWebSocket();
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/auth']),
      error: () => {
        this.authService.clearSession();
        this.router.navigate(['/auth']);
      }
    });
  }

  driverProfile: any = null;
  earningsSummary: any = null;
  currentLocation: string = 'Auto-detecting...';
  isOnline: boolean = false;
  selectedService: 'ALL' | 'CAB' | 'BIKE' | 'EQUIPMENT' = 'EQUIPMENT';

  isApproved: boolean = false;
  isPendingVerification: boolean = false;

  recentJobs: any[] = [];
  activeJob: any = null;

  showIncomingOffer: boolean = false;
  incomingOfferData: any = null;
  showNavModal: boolean = false;

  private wsSubscription?: Subscription;
  private lifecycleSubscription?: Subscription;

  ngOnInit(): void {
    this.detectCurrentLocation();
    this.loadProfile();
    this.checkVehicleStatus();
    this.loadEarnings();
    this.loadJobs();
    this.initWebSocketOffers();
  }

  detectCurrentLocation(): Promise<any> {
    return this.locationService.autoDetectLocation().then(res => {
      if (res && res.address) {
        this.currentLocation = res.address;
      } else {
        this.currentLocation = 'Nearby Location';
      }
      return res;
    });
  }

  loadProfile(): void {
    this.driverService.getProfile().subscribe({
      next: (res) => {
        const profile = (res && res.success && res.data) ? res.data : (res && res.phone ? res : null);
        if (profile) {
          this.driverProfile = profile;
          const status = (profile.status || '').toUpperCase();
          this.isApproved = (status === 'ACTIVE' || status === 'ONLINE' || status === 'ACTIVE_ONLINE');
          this.isPendingVerification = (status === 'PENDING_VERIFICATION' || status === 'DRAFT');
          this.isOnline = profile.isOnline ?? false;

          // Register device push token with backend
          if (profile.userId) {
            this.authService.registerDeviceToken(profile.userId);
          }

          if (this.isOnline && this.isApproved) {
            this.webSocketService.connectWebSocket(this.driverProfile.userId || this.driverProfile.id);
            this.startLiveLocationTracking();
          }
          this.checkVehicleStatus();
        } else {
          this.driverProfile = null;
          this.isApproved = false;
          this.isPendingVerification = false;
        }
      },
      error: () => {
        this.driverProfile = null;
        this.isApproved = false;
        this.isPendingVerification = false;
      }
    });
  }

  initWebSocketOffers(): void {
    this.wsSubscription = this.webSocketService.jobOffer$.subscribe((offer: JobOfferEvent) => {
      console.log('Incoming real-time WebSocket job offer received:', offer);
      if (this.isOnline && offer) {
        this.incomingOfferData = offer;
        this.showIncomingOffer = true;
      }
    });

    this.lifecycleSubscription = this.webSocketService.lifecycleEvent$.subscribe((evt: LifecycleSocketEvent) => {
      if (evt.event === 'BOOKING_ALREADY_ASSIGNED' && this.incomingOfferData?.bookingId === evt.bookingId) {
        this.showIncomingOffer = false;
      } else if (evt.status === 'COMPLETED' || evt.status === 'CANCELLED') {
        this.loadJobs();
      }
    });
  }

  loadEarnings(): void {
    this.driverService.getEarningsSummary().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.earningsSummary = res.data;
        } else {
          this.earningsSummary = null;
        }
      },
      error: () => {
        this.earningsSummary = null;
      }
    });
  }

  loadJobs(): void {
    // 1. Fetch active ongoing job
    this.bookingService.getActiveJob().subscribe({
      next: (res) => {
        if (res && res.success && res.data) {
          this.activeJob = res.data;
        } else {
          this.activeJob = null;
        }
      },
      error: () => {
        this.activeJob = null;
      }
    });

    // 2. Fetch driver's job history
    this.bookingService.getMyJobHistory().subscribe({
      next: (res) => {
        if (res && res.success && res.data && res.data.length > 0) {
          this.recentJobs = res.data;
          if (!this.activeJob) {
            const active = res.data.find((j: any) => 
              ['ASSIGNED', 'ACCEPTED', 'DRIVER_ON_THE_WAY', 'ARRIVED', 'STARTED', 'IN_PROGRESS'].includes(j.status)
            );
            if (active) this.activeJob = active;
          }
        } else {
          this.recentJobs = [];
        }
      },
      error: () => {
        this.recentJobs = [];
      }
    });
  }

  startLiveLocationTracking(): void {
    this.locationService.startTracking(15000, (loc) => {
      if (loc && loc.latitude && loc.longitude) {
        this.currentLocation = loc.address || this.currentLocation;
        this.driverService.updateLocation(loc.latitude, loc.longitude).subscribe({
          error: () => {}
        });
      }
    });
  }

  onToggleOnlineStatus(online: boolean): void {
    if (this.isPendingVerification && online) {
      this.isOnline = false;
      alert('Your account is under verification. You can go online once your documents are approved.');
      return;
    }

    if (online) {
      this.driverService.toggleOnline(true).subscribe({
        next: (res) => {
          if (res.success) {
            this.isOnline = true;
            this.webSocketService.connectWebSocket(this.driverProfile?.userId || this.driverProfile?.id);
            this.startLiveLocationTracking();
          } else {
            this.isOnline = false;
            alert(res.message || 'Unable to go online');
          }
        },
        error: (err) => {
          this.isOnline = false;
          alert(err?.error?.message || 'Driver profile not verified or cannot go online.');
        }
      });
    } else {
      this.isOnline = false;
      this.locationService.stopTracking();
      this.webSocketService.disconnectWebSocket();
      this.showIncomingOffer = false;
      this.driverService.toggleOnline(false).subscribe();
    }
  }

  openNavigationMap(job?: any): void {
    if (job) this.activeJob = job;
    this.showNavModal = true;
  }

  onCallCustomer(phone?: string): void {
    const targetPhone = phone || this.activeJob?.customerPhone || '+919876543210';
    window.location.href = `tel:${targetPhone}`;
  }

  goToJobDetails(jobId?: number): void {
    const id = jobId || this.activeJob?.id;
    if (id) {
      this.router.navigate(['/jobs'], { queryParams: { jobId: id } });
    } else {
      this.router.navigate(['/jobs']);
    }
  }

  onAcceptOffer(offer: any): void {
    this.showIncomingOffer = false;
    if (offer && offer.bookingId) {
      this.bookingService.acceptOffer(offer.bookingId).subscribe({
        next: (res) => {
          if (res.success) {
            this.router.navigate(['/jobs'], { queryParams: { jobId: offer.bookingId } });
          } else {
            alert(res.message || 'Offer already assigned to another driver.');
          }
        },
        error: (err) => {
          alert(err?.error?.message || 'Offer expired or already assigned to another driver.');
        }
      });
    }
  }

  onDeclineOffer(offer: any): void {
    this.showIncomingOffer = false;
    if (offer && offer.bookingId) {
      this.bookingService.rejectOffer(offer.bookingId, offer.declineReason || 'Declined by driver').subscribe({
        error: () => {}
      });
    }
  }

  onArrivedFromMap(): void {
    this.showNavModal = false;
    if (this.activeJob?.id) {
      this.router.navigate(['/jobs'], { queryParams: { jobId: this.activeJob.id } });
    }
  }

  checkVehicleStatus(): void {
    if (typeof window !== 'undefined') {
      if (localStorage.getItem('driver_vehicle_completed') === 'true') {
        this.hasCompletedVehicleDetails = true;
      }
    }

    const token = this.authService.getAccessToken();
    const driverId = this.driverProfile?.id;
    const url = token 
      ? `${environment.serverApi}/api/v1/vehicles/me`
      : (driverId ? `${environment.serverApi}/api/v1/vehicles/driver/${driverId}` : null);

    if (!url) {
      this.checkLocalVehicleFallback();
      return;
    }

    this.http.get<any>(url).subscribe({
      next: (res) => {
        const list = res?.data;
        if (Array.isArray(list) && list.length > 0) {
          const hasFilled = list.some((v: any) => v.regNumber && v.regNumber.trim().length > 0 && !v.regNumber.startsWith('TN00TEMP') && !v.regNumber.startsWith('TN-XX-TEMP'));
          this.hasCompletedVehicleDetails = hasFilled;
          if (hasFilled && typeof window !== 'undefined') {
            localStorage.setItem('driver_vehicle_completed', 'true');
          }
        } else if (driverId && !url.includes('/driver/')) {
          this.http.get<any>(`${environment.serverApi}/api/v1/vehicles/driver/${driverId}`).subscribe({
            next: (dRes) => {
              const dList = dRes?.data;
              if (Array.isArray(dList) && dList.length > 0) {
                const hasFilled = dList.some((v: any) => v.regNumber && v.regNumber.trim().length > 0 && !v.regNumber.startsWith('TN00TEMP') && !v.regNumber.startsWith('TN-XX-TEMP'));
                this.hasCompletedVehicleDetails = hasFilled;
                if (hasFilled && typeof window !== 'undefined') {
                  localStorage.setItem('driver_vehicle_completed', 'true');
                }
              } else {
                this.checkLocalVehicleFallback();
              }
            },
            error: () => this.checkLocalVehicleFallback()
          });
        } else {
          this.checkLocalVehicleFallback();
        }
      },
      error: () => this.checkLocalVehicleFallback()
    });
  }

  private checkLocalVehicleFallback(): void {
    if (typeof window !== 'undefined') {
      if (localStorage.getItem('driver_vehicle_completed') === 'true') {
        this.hasCompletedVehicleDetails = true;
        return;
      }
      try {
        const cached = localStorage.getItem('rentron_driver_vehicles') || localStorage.getItem('rentron_shared_vehicles');
        if (cached) {
          const arr = JSON.parse(cached);
          if (Array.isArray(arr) && arr.length > 0) {
            const hasFilled = arr.some((v: any) => v.regNumber && v.regNumber.trim().length > 0 && !v.regNumber.startsWith('TN00TEMP') && !v.regNumber.startsWith('TN-XX-TEMP'));
            this.hasCompletedVehicleDetails = hasFilled;
            if (hasFilled) {
              localStorage.setItem('driver_vehicle_completed', 'true');
            }
            return;
          }
        }
      } catch (e) {}
    }
    this.hasCompletedVehicleDetails = false;
  }

  ngOnDestroy(): void {
    if (this.wsSubscription) {
      this.wsSubscription.unsubscribe();
    }
    if (this.lifecycleSubscription) {
      this.lifecycleSubscription.unsubscribe();
    }
    this.locationService.stopTracking();
  }
}
