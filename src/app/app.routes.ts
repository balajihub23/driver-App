import { Routes } from '@angular/router';

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
    loadComponent: () => import('./components/jobs/jobs.component').then(m => m.JobsComponent)
  },
  {
    path: 'jobs/:id',
    loadComponent: () => import('./components/jobs/jobs.component').then(m => m.JobsComponent)
  },
  {
    path: 'earnings',
    loadComponent: () => import('./components/earnings/earnings.component').then(m => m.EarningsComponent)
  },
  {
    path: 'profile',
    loadComponent: () => import('./components/profile/profile.component').then(m => m.ProfileComponent)
  },
  {
    path: 'notifications',
    loadComponent: () => import('./components/notifications/notifications.component').then(m => m.NotificationsComponent)
  },
  {
    path: 'support',
    loadComponent: () => import('./components/support/support.component').then(m => m.SupportComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
