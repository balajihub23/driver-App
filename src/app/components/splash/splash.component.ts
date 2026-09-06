import { Component, OnInit, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

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
    this.startProgress();
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
    if (this.activeSlideIndex < this.slides.length - 1) {
      this.activeSlideIndex++;
    } else {
      this.activeSlideIndex = 3; // Show Welcome / Login screen
    }
  }

  skipSlides(): void {
    this.activeSlideIndex = 3; // Show Welcome / Login screen
  }

  onSelectAction(action: 'LOGIN' | 'REGISTER'): void {
    if (action === 'LOGIN') {
      this.router.navigate(['/auth']);
    } else {
      this.router.navigate(['/onboarding']);
    }
  }
}

