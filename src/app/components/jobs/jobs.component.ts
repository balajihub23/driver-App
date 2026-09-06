import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { BottomNavigationComponent } from '../../shared/components/bottom-navigation/bottom-navigation.component';
import { RazorPayComponent } from '../../shared/components/razor-pay/razor-pay.component';
import { NavigationModalComponent } from '../../shared/components/navigation-modal/navigation-modal.component';
import { EndJobModalComponent } from '../../shared/components/end-job-modal/end-job-modal.component';
import { BookingService } from '../../core/services/booking.service';

export type JobTab = 'ONGOING' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BottomNavigationComponent,
    RazorPayComponent,
    NavigationModalComponent,
    EndJobModalComponent
  ],
  templateUrl: './jobs.component.html',
  styleUrl: './jobs.component.scss'
})
export class JobsComponent implements OnInit, OnDestroy {
  bookingService = inject(BookingService);
  route = inject(ActivatedRoute);

  activeTab: JobTab = 'ONGOING';
  jobs: any[] = [];

  selectedJob: any = null;
  viewMode: 'DETAILS' | 'ARRIVED' | 'IN_PROGRESS' = 'DETAILS';

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
        const found = this.jobs.find(j => j.id === jobId);
        if (found) {
          this.selectedJob = found;
        } else {
          this.selectedJob = this.getFallbackJob(jobId);
        }
      }
    });
  }

  loadBookings(): void {
    this.bookingService.getBookings().subscribe({
      next: (res) => {
        if (res.success && res.data && res.data.length > 0) {
          this.jobs = res.data;
        } else {
          this.jobs = [this.getFallbackJob(1082)];
        }
      },
      error: () => {
        this.jobs = [this.getFallbackJob(1082)];
      }
    });
  }

  getFallbackJob(id: number = 1082): any {
    return {
      id: id,
      bookingNumber: 'RD-8824',
      productName: 'JCB 3DX Backhoe Loader',
      pickupLocation: 'Metro Construction Site, Sector 21',
      dropLocation: 'North Industrial Zone',
      totalAmount: 2400,
      paymentStatus: 'PENDING',
      status: 'ASSIGNED',
      customerName: 'Urban Infra Projects',
      customerPhone: '+919876543210',
      bookingDate: 'May 15, 2024',
      workSchedule: '09:00 AM - 05:00 PM (8 Hrs)',
      addOns: [
        { name: 'Extra Bucket Set', desc: 'Heavy duty digging', price: 500 },
        { name: 'Extended Reach Arm', desc: '+2m reach depth', price: 800 },
        { name: 'Transport: ₹80/km', desc: 'Distance: 25 km', price: 2000 }
      ]
    };
  }

  filteredJobs(): any[] {
    return this.jobs.filter(j => {
      if (this.activeTab === 'ONGOING') return ['ASSIGNED', 'ACCEPTED', 'DRIVER_ON_THE_WAY', 'ARRIVED', 'STARTED', 'IN_PROGRESS'].includes(j.status);
      if (this.activeTab === 'SCHEDULED') return j.status === 'CONFIRMED' || j.status === 'PENDING';
      if (this.activeTab === 'COMPLETED') return j.status === 'COMPLETED';
      if (this.activeTab === 'CANCELLED') return j.status === 'CANCELLED' || j.status === 'REJECTED';
      return true;
    });
  }

  selectJob(job: any): void {
    this.selectedJob = job;
    if (job.status === 'ARRIVED') {
      this.viewMode = 'ARRIVED';
    } else if (['STARTED', 'IN_PROGRESS'].includes(job.status)) {
      this.viewMode = 'IN_PROGRESS';
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

  onArrivedFromMap(): void {
    this.showNavModal = false;
    if (this.selectedJob) {
      this.selectedJob.status = 'ARRIVED';
      this.viewMode = 'ARRIVED';
      this.bookingService.updateStatus(this.selectedJob.id, 'ARRIVED').subscribe();
    }
  }

  onStartJobClick(): void {
    if (this.selectedJob) {
      this.selectedJob.status = 'IN_PROGRESS';
      this.viewMode = 'IN_PROGRESS';
      this.startJobTimer();
    }
  }

  onAcknowledgeDispatch(): void {
    if (this.selectedJob) {
      this.selectedJob.status = 'ACCEPTED';
      this.bookingService.updateStatus(this.selectedJob.id, 'ACCEPTED').subscribe();
      alert('Dispatch Acknowledged! You can now start navigation to the site.');
    }
  }

  onDeclineJob(): void {
    if (this.selectedJob) {
      this.selectedJob.status = 'REJECTED';
      this.bookingService.updateStatus(this.selectedJob.id, 'REJECTED').subscribe();
      alert('Job declined successfully.');
      this.selectedJob = null;
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
    if (this.selectedJob) {
      this.bookingService.updateStatus(this.selectedJob.id, 'IN_PROGRESS').subscribe();
    }
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
    if (this.selectedJob) {
      this.selectedJob.status = 'COMPLETED';
      this.bookingService.updateStatus(this.selectedJob.id, 'COMPLETED').subscribe();
    }
    this.clearTimer();
    alert(`Job Completed successfully!\nProof Image Attached: ${event.proofPhoto ? 'Yes' : 'No'}\nNotes: ${event.description}`);
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
