import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BottomNavigationComponent } from '../../shared/components/bottom-navigation/bottom-navigation.component';
import { NavigationModalComponent } from '../../shared/components/navigation-modal/navigation-modal.component';
import { EndJobModalComponent } from '../../shared/components/end-job-modal/end-job-modal.component';
import { BookingService } from '../../core/services/booking.service';
import { LocationService } from '../../core/services/location.service';

export type JobTab = 'ONGOING' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BottomNavigationComponent,
    NavigationModalComponent,
    EndJobModalComponent
  ],
  templateUrl: './jobs.component.html',
  styleUrl: './jobs.component.scss'
})
export class JobsComponent implements OnInit, OnDestroy {
  bookingService = inject(BookingService);
  locationService = inject(LocationService);
  route = inject(ActivatedRoute);
  router = inject(Router);

  activeTab: JobTab = 'ONGOING';
  jobs: any[] = [];
  isLoading: boolean = false;

  selectedJob: any = null;
  viewMode: 'DETAILS' | 'ARRIVED' | 'IN_PROGRESS' = 'DETAILS';

  // OTP Verification state
  showOtpDialog: boolean = false;
  otpValue: string = '';
  otpError: string = '';
  isVerifyingOtp: boolean = false;

  elapsedSeconds: number = 0;
  isPaused: boolean = false;
  startedTimeText: string = '';
  private timerInterval: any = null;

  showNavModal: boolean = false;
  showEndJobModal: boolean = false;
  showPaymentModal: boolean = false;
  isProcessingCash: boolean = false;
  isProcessingRazorpay: boolean = false;
  pendingProofUpload: (() => void) | null = null;

  ngOnInit(): void {
    this.loadBookings();
    this.route.queryParams.subscribe(params => {
      if (params['jobId']) {
        const jobId = Number(params['jobId']);
        this.loadJobById(jobId);
      }
    });
  }

  loadBookings(): void {
    this.isLoading = true;
    this.bookingService.getMyJobHistory().subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res && res.success && Array.isArray(res.data)) {
          this.jobs = res.data;
          this.checkActiveJobFromList();
        } else {
          this.jobs = [];
        }
      },
      error: () => {
        this.isLoading = false;
        this.jobs = [];
      }
    });
  }

  loadJobById(jobId: number): void {
    this.bookingService.getBookingById(jobId).subscribe({
      next: (res) => {
        if (res && res.success && res.data) {
          this.selectJob(res.data);
        } else {
          const found = this.jobs.find(j => j.id === jobId);
          if (found) this.selectJob(found);
        }
      },
      error: () => {
        const found = this.jobs.find(j => j.id === jobId);
        if (found) this.selectJob(found);
      }
    });
  }

  private checkActiveJobFromList(): void {
    if (!this.selectedJob) {
      const active = this.jobs.find(j => 
        ['ASSIGNED', 'ACCEPTED', 'DRIVER_ON_THE_WAY', 'ARRIVED', 'STARTED', 'IN_PROGRESS'].includes(j.status)
      );
      if (active) {
        this.selectJob(active);
      }
    }
  }

  filteredJobs(): any[] {
    return this.jobs.filter(j => {
      if (this.activeTab === 'ONGOING') return ['ASSIGNED', 'ACCEPTED', 'DRIVER_ON_THE_WAY', 'ARRIVED', 'STARTED', 'IN_PROGRESS'].includes(j.status);
      if (this.activeTab === 'SCHEDULED') return j.status === 'CONFIRMED' || j.status === 'PENDING' || j.status === 'SEARCHING_DRIVER';
      if (this.activeTab === 'COMPLETED') return j.status === 'COMPLETED';
      if (this.activeTab === 'CANCELLED') return j.status === 'CANCELLED' || j.status === 'REJECTED' || j.status === 'EXPIRED';
      return true;
    });
  }

  selectJob(job: any): void {
    this.selectedJob = job;
    if (job.status === 'ARRIVED') {
      this.viewMode = 'ARRIVED';
    } else if (['STARTED', 'IN_PROGRESS'].includes(job.status)) {
      this.viewMode = 'IN_PROGRESS';
      this.startJobTimer();
    } else {
      this.viewMode = 'DETAILS';
    }
  }

  getStatusClass(status: string): string {
    if (['ASSIGNED', 'ACCEPTED'].includes(status)) return 'status-badge st-assigned';
    if (['STARTED', 'IN_PROGRESS', 'DRIVER_ON_THE_WAY', 'ARRIVED'].includes(status)) return 'status-badge st-progress';
    if (status === 'COMPLETED') return 'status-badge st-completed';
    return 'status-badge st-cancelled';
  }

  openNavigationMap(): void {
    this.showNavModal = true;
  }

  onStartDrivingToPickup(): void {
    if (!this.selectedJob) return;
    this.bookingService.markArriving(this.selectedJob.id).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.selectedJob = res.data;
        } else {
          this.selectedJob.status = 'DRIVER_ON_THE_WAY';
        }
      },
      error: (err) => {
        alert(err?.error?.message || 'Could not update status to DRIVER_ON_THE_WAY');
      }
    });
  }

  onMarkArrived(): void {
    if (!this.selectedJob) return;
    this.bookingService.markArrived(this.selectedJob.id).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.selectedJob = res.data;
        } else {
          this.selectedJob.status = 'ARRIVED';
        }
        this.viewMode = 'ARRIVED';
      },
      error: (err) => {
        alert(err?.error?.message || 'Could not update status to ARRIVED');
      }
    });
  }

  onArrivedFromMap(): void {
    this.showNavModal = false;
    this.onMarkArrived();
  }

  openOtpDialog(): void {
    this.showOtpDialog = true;
    this.otpValue = '';
    this.otpError = '';
  }

  closeOtpDialog(): void {
    this.showOtpDialog = false;
    this.otpValue = '';
    this.otpError = '';
  }

  onVerifyOtp(): void {
    const rawOtp = String(this.otpValue ?? '').trim();
    if (!rawOtp || rawOtp.length < 4) {
      this.otpError = 'Please enter the valid 4-digit OTP provided by customer.';
      return;
    }

    if (!this.selectedJob) return;

    this.isVerifyingOtp = true;
    this.otpError = '';

    this.bookingService.verifyOtp(this.selectedJob.id, rawOtp).subscribe({
      next: (res) => {
        this.isVerifyingOtp = false;
        if (res.success && res.data) {
          this.selectedJob = res.data;
          this.showOtpDialog = false;
          this.viewMode = 'IN_PROGRESS';
          this.startJobTimer();
        } else {
          this.otpError = res.message || 'OTP Verification failed';
        }
      },
      error: (err) => {
        this.isVerifyingOtp = false;
        this.otpError = err?.error?.message || 'Invalid OTP. Please check with customer and try again.';
      }
    });
  }

  onDeclineJob(): void {
    if (this.selectedJob) {
      if (confirm('Are you sure you want to decline this job?')) {
        this.bookingService.rejectOffer(this.selectedJob.id, 'Declined by driver').subscribe({
          next: () => {
            alert('Job declined.');
            this.selectedJob = null;
            this.loadBookings();
          },
          error: (err) => alert(err?.error?.message || 'Could not decline job')
        });
      }
    }
  }

  onCallCustomer(): void {
    const phone = this.selectedJob?.customerPhone || '+919876543210';
    window.location.href = `tel:${phone}`;
  }

  onMessageCustomer(): void {
    const phone = this.selectedJob?.customerPhone || '+919876543210';
    window.location.href = `sms:${phone}`;
  }

  startJobTimer(): void {
    this.startedTimeText = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.isPaused = false;

    if (!this.timerInterval) {
      this.timerInterval = setInterval(() => {
        if (!this.isPaused) {
          this.elapsedSeconds++;
        }
      }, 1000);
    }
  }

  pauseJobTimer(): void {
    this.isPaused = true;
  }

  resumeJobTimer(): void {
    this.isPaused = false;
  }

  isMachineryJob(job: any): boolean {
    if (!job) return false;

    // Check bookingType
    const bookingType = String(job.bookingType || '').toUpperCase();
    if (
      bookingType.includes('EQUIPMENT') ||
      bookingType.includes('MACHINERY') ||
      bookingType.includes('HEAVY') ||
      bookingType.includes('JCB')
    ) {
      return true;
    }

    // Check fareBreakdownSnapshot
    if (job.fareBreakdownSnapshot) {
      try {
        const snap = typeof job.fareBreakdownSnapshot === 'string'
          ? JSON.parse(job.fareBreakdownSnapshot)
          : job.fareBreakdownSnapshot;
        const pType = String(snap.productType || snap.pricingModel || '').toUpperCase();
        if (
          pType.includes('EQUIPMENT') ||
          pType.includes('MACHINERY') ||
          pType.includes('JCB') ||
          pType.includes('EXCAVATOR') ||
          pType.includes('CRANE') ||
          pType.includes('ROLLER')
        ) {
          return true;
        }
      } catch (e) {}
    }

    // Check productType or category
    const productType = String(job.productType || job.category || '').toUpperCase();
    if (
      productType.includes('EQUIPMENT') ||
      productType.includes('MACHINERY') ||
      productType.includes('JCB') ||
      productType.includes('EXCAVATOR') ||
      productType.includes('CRANE') ||
      productType.includes('ROLLER')
    ) {
      return true;
    }

    // Check productName / service name keywords
    const name = String(job.productName || job.serviceName || '').toLowerCase();
    const machineryKeywords = [
      'jcb',
      'excavator',
      'crane',
      'roller',
      'dozer',
      'loader',
      'compactor',
      'tractor',
      'heavy equipment',
      'machinery',
      'backhoe'
    ];
    if (machineryKeywords.some(kw => name.includes(kw))) {
      return true;
    }

    return false;
  }

  onOpenEndJobModal(): void {
    if (!this.selectedJob) return;

    if (this.isMachineryJob(this.selectedJob)) {
      // Machinery: requires site completion photo & work notes
      this.showEndJobModal = true;
    } else {
      // Car / Bike / Cab / Auto: complete ride directly with confirmation
      if (confirm('Are you sure you want to complete this ride?')) {
        this.completeJobDirectly();
      }
    }
  }

  completeJobDirectly(): void {
    if (!this.selectedJob) return;

    if (this.selectedJob.paymentStatus === 'PAID') {
      this.finalizeJobDirectly();
    } else {
      // Prompt payment verification: Cash vs Online
      this.showPaymentModal = true;
    }
  }

  finalizeJobDirectly(): void {
    if (!this.selectedJob) return;
    this.bookingService.completeJob(this.selectedJob.id).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.selectedJob = res.data;
        } else {
          this.selectedJob.status = 'COMPLETED';
        }
        this.clearTimer();
        this.viewMode = 'DETAILS';
        alert('Ride completed successfully! Earnings have been credited to your account.');
        this.loadBookings();
      },
      error: (err) => alert(err?.error?.message || 'Failed to complete ride.')
    });
  }

  onConfirmCashPayment(): void {
    if (!this.selectedJob) return;
    this.isProcessingCash = true;

    this.bookingService.confirmCashPayment(this.selectedJob.id).subscribe({
      next: (res) => {
        this.isProcessingCash = false;
        this.showPaymentModal = false;
        if (res.success && res.data) {
          this.selectedJob = res.data;
        } else {
          this.selectedJob.status = 'COMPLETED';
          this.selectedJob.paymentStatus = 'PAID';
        }
        this.clearTimer();
        this.viewMode = 'DETAILS';

        if (this.pendingProofUpload) {
          this.pendingProofUpload();
          this.pendingProofUpload = null;
        }

        alert('Cash payment confirmed! Ride closed and earnings recorded.');
        this.loadBookings();
      },
      error: (err) => {
        this.isProcessingCash = false;
        alert(err?.error?.message || 'Could not record cash payment.');
      }
    });
  }

  loadRazorpayScript(callback: () => void): void {
    if ((window as any).Razorpay) {
      callback();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => callback();
    script.onerror = (err) => console.error('Failed to load Razorpay script', err);
    document.head.appendChild(script);
  }

  onCollectOnlineViaRazorpay(): void {
    if (!this.selectedJob) return;
    this.isProcessingRazorpay = true;
    const finalAmount = this.selectedJob.finalFare || this.selectedJob.totalAmount || 274;

    this.bookingService.getBookingSettings().subscribe({
      next: (settingsRes) => {
        const keyId = settingsRes?.data?.keyId || 'rzp_test_mGa2SfsXusZ9u7';
        this.loadRazorpayScript(() => {
          this.isProcessingRazorpay = false;
          const options: any = {
            key: keyId,
            amount: Math.round(finalAmount * 100),
            currency: 'INR',
            name: 'Rentron Platform',
            description: 'Ride Fare #' + (this.selectedJob.bookingNumber || this.selectedJob.id),
            prefill: {
              name: this.selectedJob.customerName || 'Customer',
              contact: this.selectedJob.customerPhone || '9876543210'
            },
            theme: { color: '#F59E0B' },
            handler: (response: any) => {
              if (response.razorpay_payment_id) {
                this.bookingService.verifyPaymentSignature({
                  bookingId: this.selectedJob.id,
                  razorpayOrderId: response.razorpay_order_id || ('order_' + Date.now()),
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature || 'mock_sig'
                }).subscribe({
                  next: (verifyRes) => {
                    this.showPaymentModal = false;
                    this.selectedJob.status = 'COMPLETED';
                    this.selectedJob.paymentStatus = 'PAID';
                    this.clearTimer();
                    this.viewMode = 'DETAILS';
                    alert('Online payment verified! Ride completed successfully.');
                    this.loadBookings();
                  },
                  error: () => {
                    this.showPaymentModal = false;
                    this.selectedJob.status = 'COMPLETED';
                    this.clearTimer();
                    this.viewMode = 'DETAILS';
                    this.loadBookings();
                  }
                });
              }
            }
          };
          const rzp = new (window as any).Razorpay(options);
          rzp.open();
        });
      },
      error: () => {
        this.isProcessingRazorpay = false;
        alert('Could not initialize payment gateway.');
      }
    });
  }

  onJobEndedWithProof(event: { proofPhoto: File | null; description: string }): void {
    this.showEndJobModal = false;
    if (!this.selectedJob) return;

    const finalize = () => {
      this.bookingService.completeJob(this.selectedJob.id).subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.selectedJob = res.data;
          } else {
            this.selectedJob.status = 'COMPLETED';
          }
          this.clearTimer();
          this.viewMode = 'DETAILS';
          alert('Job marked as COMPLETED! Earnings have been credited to your account.');
          this.loadBookings();
        },
        error: (err) => alert(err?.error?.message || 'Failed to complete job')
      });
    };

    const runProof = () => {
      if (event.proofPhoto) {
        const reader = new FileReader();
        reader.onload = () => {
          const base64Url = reader.result as string;
          this.bookingService.uploadProof(this.selectedJob.id, base64Url).subscribe({
            next: () => finalize(),
            error: () => finalize()
          });
        };
        reader.readAsDataURL(event.proofPhoto);
      } else {
        finalize();
      }
    };

    if (this.selectedJob.paymentStatus === 'PAID') {
      runProof();
    } else {
      this.pendingProofUpload = runProof;
      this.showPaymentModal = true;
    }
  }

  formatTimer(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  onPaymentCompleted(event: { success: boolean; data?: any; error?: string }): void {
    if (event.success) {
      if (this.selectedJob) {
        this.selectedJob.paymentStatus = 'PAID';
      }
      alert('Payment successful! Transaction ID: ' + (event.data?.paymentId || 'N/A'));
    } else {
      alert('Payment failed: ' + (event.error || 'Unknown error'));
    }
  }

  private clearTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }
}
