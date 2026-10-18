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
    if (!this.otpValue || this.otpValue.trim().length < 4) {
      this.otpError = 'Please enter the valid 4-digit OTP provided by customer.';
      return;
    }

    if (!this.selectedJob) return;

    this.isVerifyingOtp = true;
    this.otpError = '';

    this.bookingService.verifyOtp(this.selectedJob.id, this.otpValue.trim()).subscribe({
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

  onOpenEndJobModal(): void {
    this.showEndJobModal = true;
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
          alert('Job marked as COMPLETED! Earnings have been credited to your account.');
          this.loadBookings();
        },
        error: (err) => alert(err?.error?.message || 'Failed to complete job')
      });
    };

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
