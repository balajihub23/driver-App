import { Routes } from '@angular/router';
import { verificationGuard } from './core/guards/verification.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/splash/splash.component').then(m => m.SplashComponent)
  },
  {
    path: 'auth',
    loadComponent: () => import('./components/auth/auth.component').then(m => m.AuthComponent)
  },
  {
    path: 'onboarding',
    loadComponent: () => import('./components/onboarding/onboarding.component').then(m => m.OnboardingComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'jobs',
    canActivate: [verificationGuard],
    loadComponent: () => import('./components/jobs/jobs.component').then(m => m.JobsComponent)
  },
  {
    path: 'jobs/:id',
    canActivate: [verificationGuard],
    loadComponent: () => import('./components/jobs/jobs.component').then(m => m.JobsComponent)
  },
  {
    path: 'earnings',
    canActivate: [verificationGuard],
    loadComponent: () => import('./components/earnings/earnings.component').then(m => m.EarningsComponent)
  },
  {
    path: 'profile',
    canActivate: [verificationGuard],
    loadComponent: () => import('./components/profile/profile.component').then(m => m.ProfileComponent)
  },
  {
    path: 'notifications',
    canActivate: [verificationGuard],
    loadComponent: () => import('./components/notifications/notifications.component').then(m => m.NotificationsComponent)
  },
  {
    path: 'support',
    canActivate: [verificationGuard],
    loadComponent: () => import('./components/support/support.component').then(m => m.SupportComponent)
  },
  {
    path: 'service-error',
    loadComponent: () => import('./components/service-error/service-error.component').then(m => m.ServiceErrorComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
