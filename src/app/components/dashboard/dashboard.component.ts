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
import { WebSocketService, JobOfferEvent } from '../../core/services/websocket.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    DriverHeaderComponent,
    BottomNavigationComponent,
    BookingOfferModalComponent,
    NavigationModalComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
  driverService = inject(DriverService);
  bookingService = inject(BookingService);
  locationService = inject(LocationService);
  webSocketService = inject(WebSocketService);
  router = inject(Router);

  driverProfile: any = null;
  earningsSummary: any = null;
  currentLocation: string = 'Auto-detecting...';
  isOnline: boolean = true;
  selectedService: 'ALL' | 'CAB' | 'BIKE' | 'EQUIPMENT' = 'EQUIPMENT';

  recentJobs: any[] = [];
  activeJob: any = {
    id: 1082,
    bookingNumber: 'RD-8824',
    productName: 'JCB 3DX',
    pickupLocation: 'Metro Construction Site, Sector 21',
    customerPhone: '+919876543210',
    elapsedTimeText: '2h 15m elapsed',
    status: 'IN_PROGRESS'
  };

  showIncomingOffer: boolean = false;
  incomingOfferData: any = null;
  showNavModal: boolean = false;

  private wsSubscription?: Subscription;

  ngOnInit(): void {
    this.detectCurrentLocation();
    this.loadProfile();
    this.loadEarnings();
    this.loadJobs();
    this.initWebSocketOffers();
  }

  detectCurrentLocation(): Promise<any> {
    return this.locationService.autoDetectLocation().then(res => {
      if (res && res.address) {
        this.currentLocation = res.address;
      } else {
        this.currentLocation = 'Sector 18, Gurugram';
      }
      return res;
    });
  }

  loadProfile(): void {
    this.driverService.getProfile().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.driverProfile = res.data;
          this.isOnline = res.data.isOnline ?? true;
          if (this.isOnline) {
            this.webSocketService.connectWebSocket(this.driverProfile.userId || this.driverProfile.id);
          }
        }
      },
      error: () => {
        this.driverProfile = { fullName: 'Suren', id: 1 };
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
  }

  loadEarnings(): void {
    this.driverService.getEarningsSummary().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.earningsSummary = res.data;
        } else {
          this.earningsSummary = {
            totalEarnings: 4800,
            totalJobs: 2,
            workHours: 6.5
          };
        }
      }
    });
  }

  loadJobs(): void {
    this.bookingService.getBookings().subscribe({
      next: (res) => {
        if (res.success && res.data && res.data.length > 0) {
          this.recentJobs = res.data;
          const active = res.data.find((j: any) => ['IN_PROGRESS', 'STARTED', 'DRIVER_ON_THE_WAY', 'ARRIVED'].includes(j.status));
          if (active) this.activeJob = active;
        }
      }
    });
  }

  onToggleOnlineStatus(online: boolean): void {
    this.isOnline = online;

    if (online) {
      this.detectCurrentLocation().then(locRes => {
        if (locRes && locRes.latitude && locRes.longitude) {
          this.driverService.updateLocation(locRes.latitude, locRes.longitude).subscribe();
        }
      });
      this.webSocketService.connectWebSocket(this.driverProfile?.userId || this.driverProfile?.id);
    } else {
      this.webSocketService.disconnectWebSocket();
      this.showIncomingOffer = false;
    }

    this.driverService.toggleOnline(online).subscribe();
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
    const id = jobId || this.activeJob?.id || 1082;
    this.router.navigate(['/jobs'], { queryParams: { jobId: id } });
  }

  onAcceptOffer(offer: any): void {
    this.showIncomingOffer = false;
    if (offer && offer.bookingId) {
      this.bookingService.acceptOffer(offer.bookingId, this.driverProfile?.id || 1).subscribe({
        next: () => {
          this.router.navigate(['/jobs'], { queryParams: { jobId: offer.bookingId } });
        },
        error: () => {
          this.router.navigate(['/jobs'], { queryParams: { jobId: offer.bookingId } });
        }
      });
    }
  }

  onArrivedFromMap(): void {
    this.showNavModal = false;
    this.router.navigate(['/jobs'], { queryParams: { jobId: this.activeJob?.id || 1082 } });
  }

  ngOnDestroy(): void {
    if (this.wsSubscription) {
      this.wsSubscription.unsubscribe();
    }
  }
}
