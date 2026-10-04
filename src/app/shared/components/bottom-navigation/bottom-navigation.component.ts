import { Component, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { DriverService } from '../../../core/services/driver.service';

@Component({
  selector: 'app-bottom-navigation',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './bottom-navigation.component.html',
  styleUrl: './bottom-navigation.component.scss'
})
export class BottomNavigationComponent implements OnInit {
  driverService = inject(DriverService);
  router = inject(Router);
  platformId = inject(PLATFORM_ID);

  isPendingVerification: boolean = false;
  isFleetDriver: boolean = false;

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      const savedRole = localStorage.getItem('selectedRole');
      const savedOpType = localStorage.getItem('operationType');
      if (savedRole === 'FLEET_OWNER' || savedOpType === 'FLEET') {
        this.isFleetDriver = true;
      }
    }

    this.driverService.getProfile().subscribe({
      next: (res) => {
        const profile = (res && res.success && res.data) ? res.data : (res && res.phone ? res : null);
        if (profile) {
          const status = (profile.status || '').toUpperCase();
          this.isPendingVerification = (status === 'PENDING_VERIFICATION');
          if (profile.operationType === 'FLEET' || profile.role === 'FLEET_OWNER') {
            this.isFleetDriver = true;
          }
        }
      }
    });
  }

  onNavClick(event: Event, targetPath: string): void {
    if (this.isPendingVerification && targetPath !== '/dashboard') {
      event.preventDefault();
      event.stopPropagation();
    }
  }
}
