import { Component, Input, Output, EventEmitter, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LocationService } from '../../../core/services/location.service';

@Component({
  selector: 'app-navigation-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navigation-modal.component.html',
  styleUrl: './navigation-modal.component.scss'
})
export class NavigationModalComponent implements OnInit {
  @Input() isOpen: boolean = false;
  @Input() jobData: any = null;

  @Output() close = new EventEmitter<void>();
  @Output() arrivedAtSite = new EventEmitter<any>();

  locationService = inject(LocationService);

  driverLat: number = 28.4595;
  driverLng: number = 77.0266;
  driverAddress: string = 'Current Driver Position';

  customerLat: number = 28.5355;
  customerLng: number = 77.3910;
  customerAddress: string = 'Metro Construction Site, Sector 21';
  customerPhone: string = '+919876543210';

  etaMinutes: number = 5;
  distanceKm: string = '1.8 km';
  estimatedTimeText: string = '14:37';

  ngOnInit(): void {
    this.locationService.autoDetectLocation().then(res => {
      if (res) {
        this.driverLat = res.latitude;
        this.driverLng = res.longitude;
        this.driverAddress = res.address;
      }
    });

    if (this.jobData) {
      if (this.jobData.pickupLocation) this.customerAddress = this.jobData.pickupLocation;
      if (this.jobData.customerPhone) this.customerPhone = this.jobData.customerPhone;
      if (this.jobData.pickupLat) this.customerLat = this.jobData.pickupLat;
      if (this.jobData.pickupLng) this.customerLng = this.jobData.pickupLng;
    }
  }

  onCallCustomer(): void {
    window.location.href = `tel:${this.customerPhone}`;
  }

  onArrivedClick(): void {
    this.arrivedAtSite.emit(this.jobData);
  }

  onCloseClick(): void {
    this.close.emit();
  }
}
