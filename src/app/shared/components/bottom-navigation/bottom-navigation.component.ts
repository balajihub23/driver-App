import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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

  isPendingVerification: boolean = false;

  ngOnInit(): void {
    this.driverService.getProfile().subscribe({
      next: (res) => {
        const profile = (res && res.success && res.data) ? res.data : (res && res.phone ? res : null);
        if (profile) {
          const status = (profile.status || '').toUpperCase();
          this.isPendingVerification = (status === 'PENDING_VERIFICATION');
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
