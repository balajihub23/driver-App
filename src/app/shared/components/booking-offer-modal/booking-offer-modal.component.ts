import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

export type OfferStep = 'NEW_REQUEST' | 'DECLINE_REASONS' | 'DECLINED_CONFIRMATION' | 'REVIEW_CONNECT';

@Component({
  selector: 'app-booking-offer-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './booking-offer-modal.component.html',
  styleUrl: './booking-offer-modal.component.scss'
})
export class BookingOfferModalComponent implements OnInit, OnDestroy, OnChanges {
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
  isSubmitting: boolean = false;
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
      this.resetAndStart();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.resetAndStart();
    } else if (changes['offerData'] && this.isOpen) {
      this.resetAndStart();
    }
  }

  private resetAndStart(): void {
    this.currentStep = 'NEW_REQUEST';
    this.isSubmitting = false;
    this.selectedDeclineReason = '';
    const secs = this.offerData?.expiresInSeconds || this.timeoutSeconds || 30;
    this.remainingSeconds = secs;
    this.startCountdown(secs);
  }

  startCountdown(totalSecs: number = 30): void {
    this.clearTimer();
    this.remainingSeconds = totalSecs;
    this.updateRing(totalSecs);

    this.intervalId = setInterval(() => {
      this.remainingSeconds--;
      this.updateRing(totalSecs);

      if (this.remainingSeconds <= 0) {
        this.clearTimer();
        this.currentStep = 'DECLINED_CONFIRMATION';
      }
    }, 1000);
  }

  updateRing(totalSecs: number = 30): void {
    const circumference = 251.3;
    const progress = Math.max(0, this.remainingSeconds) / (totalSecs || 30);
    this.strokeDashoffset = circumference * (1 - progress);
  }

  onAcceptClick(): void {
    if (this.isSubmitting) return;
    this.isSubmitting = true;
    this.clearTimer();
    this.accepted.emit(this.offerData);
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
    this.currentStep = 'REVIEW_CONNECT';
  }

  onViewJobDetailsClick(): void {
    this.viewDetails.emit(this.offerData);
  }

  onCloseDone(): void {
    this.isOpen = false;
    this.currentStep = 'NEW_REQUEST';
    this.isSubmitting = false;
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
