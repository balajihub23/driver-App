import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-service-error',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './service-error.component.html',
  styleUrl: './service-error.component.scss'
})
export class ServiceErrorComponent implements OnInit {
  authService = inject(AuthService);
  router = inject(Router);
  route = inject(ActivatedRoute);

  errorCode: string = '401';
  errorTitle: string = 'Unauthorized Access';
  errorMessage: string = 'Your authentication session has expired or you do not have permission to access this resource.';

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['code']) {
        this.errorCode = params['code'];
      }
      if (params['title']) {
        this.errorTitle = params['title'];
      }
      if (params['message']) {
        this.errorMessage = params['message'];
      } else if (this.errorCode === '503' || this.errorCode === '0') {
        this.errorTitle = 'Service Unavailable';
        this.errorMessage = 'Unable to connect to Rentron backend services. The server might be down or unreachable.';
      }
    });
  }

  onLogout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/auth']);
      },
      error: () => {
        this.authService.clearSession();
        this.router.navigate(['/auth']);
      }
    });
  }

  onRetry(): void {
    this.router.navigate(['/dashboard']);
  }
}
