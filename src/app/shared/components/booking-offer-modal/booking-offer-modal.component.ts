import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

export type OfferStep = 'NEW_REQUEST' | 'DECLINE_REASONS' | 'DECLINED_CONFIRMATION' | 'REVIEW_CONNECT';

@Component({
  selector: 'app-booking-offer-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './booking-offer-modal.component.html',
  styleUrl: './booking-offer-modal.component.scss'
})
export class BookingOfferModalComponent implements OnInit, OnDestroy {
  @Input() isOpen: boolean = false;
  @Input() offerData: any = null;
  @Input() timeoutSeconds: number = 30;

  @Output() accepted = new EventEmitter<any>();
  @Output() declined = new EventEmitter<any>();
  @Output() viewDetails = new EventEmitter<any>();

  currentStep: OfferStep = 'NEW_REQUEST';
  remainingSeconds: number = 30;
  strokeDashoffset: number = 0;
  selectedDeclineReason: string = '';
  private intervalId: any = null;

  declineReasons: string[] = [
    'Too far away',
    'Vehicle maintenance required',
    'Rate is too low',
    'Already on another job',
    'Personal emergency',
    'Other'
  ];

  ngOnInit(): void {
    if (this.isOpen) {
      this.startCountdown();
    }
  }

  startCountdown(): void {
    this.remainingSeconds = this.timeoutSeconds;
    this.updateRing();

    this.intervalId = setInterval(() => {
      this.remainingSeconds--;
      this.updateRing();

      if (this.remainingSeconds <= 0) {
        this.clearTimer();
        this.currentStep = 'DECLINED_CONFIRMATION';
      }
    }, 1000);
  }

  updateRing(): void {
    // Circumference = 2 * PI * r (r = 40 => ~251.3)
    const circumference = 251.3;
    const progress = this.remainingSeconds / this.timeoutSeconds;
    this.strokeDashoffset = circumference * (1 - progress);
  }

  onDeclineClick(): void {
    this.clearTimer();
    this.currentStep = 'DECLINE_REASONS';
  }

  onConfirmDecline(): void {
    this.currentStep = 'DECLINED_CONFIRMATION';
    this.declined.emit({ ...this.offerData, declineReason: this.selectedDeclineReason });
  }

  onReviewConnectClick(): void {
    this.clearTimer();
    this.currentStep = 'REVIEW_CONNECT';
  }

  onViewJobDetailsClick(): void {
    this.viewDetails.emit(this.offerData);
  }

  onCloseDone(): void {
    this.isOpen = false;
    this.currentStep = 'NEW_REQUEST';
  }

  private clearTimer(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }
}
