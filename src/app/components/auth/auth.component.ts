import { Component, Output, EventEmitter, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DriverService } from '../../core/services/driver.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.scss'
})
export class AuthComponent implements OnInit, OnDestroy {
  @Output() backToSplash = new EventEmitter<void>();
  @Output() authSuccess = new EventEmitter<{ phone: string; isRegistered: boolean }>();

  authService = inject(AuthService);
  driverService = inject(DriverService);
  router = inject(Router);

  currentStep: 'PHONE' | 'OTP' = 'PHONE';
  phoneNumber: string = '';
  otpDigits: string[] = ['', '', '', '', '', ''];
  loading: boolean = false;
  errorMessage: string = '';
  resendTimer: number = 30;
  private timerInterval: any = null;

  ngOnInit(): void {}

  goBack(): void {
    this.errorMessage = '';
    if (this.currentStep === 'OTP') {
      this.currentStep = 'PHONE';
      this.clearTimer();
    } else {
      this.router.navigate(['/splash']);
    }
  }

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.phoneNumber = input.value.replace(/[^0-9]/g, '').slice(0, 10);
    input.value = this.phoneNumber;
    this.errorMessage = '';
  }

  onOtpInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const clean = input.value.replace(/[^0-9]/g, '');
    this.otpDigits[index] = clean;
    input.value = clean;
    this.errorMessage = '';

    if (clean && index < 5) {
      const nextInput = input.nextElementSibling as HTMLInputElement;
      if (nextInput) nextInput.focus();
    }
  }

  onOtpPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pastedText = event.clipboardData?.getData('text') || '';
    const digits = pastedText.replace(/[^0-9]/g, '').slice(0, 6).split('');
    digits.forEach((digit, i) => {
      if (i < 6) {
        this.otpDigits[i] = digit;
      }
    });
    this.errorMessage = '';
    if (this.isOtpComplete()) {
      this.onVerifyOtp();
    }
  }

  onSendOtp(): void {
    if (this.phoneNumber.length < 10) {
      this.errorMessage = 'Please enter a valid 10-digit mobile number.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.authService.sendOtp(this.phoneNumber, 'LOGIN').subscribe({
      next: () => {
        this.loading = false;
        this.currentStep = 'OTP';
        this.startResendTimer();
      },
      error: () => {
        this.loading = false;
        this.currentStep = 'OTP';
        this.startResendTimer();
      }
    });
  }

  startResendTimer(): void {
    this.clearTimer();
    this.resendTimer = 30;
    this.timerInterval = setInterval(() => {
      this.resendTimer--;
      if (this.resendTimer <= 0) {
        this.clearTimer();
      }
    }, 1000);
  }

  clearTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  onOtpKeyUp(event: KeyboardEvent, index: number): void {
    const input = event.target as HTMLInputElement;
    if (event.key === 'Backspace' && index > 0 && !input.value) {
      const prevInput = input.previousElementSibling as HTMLInputElement;
      if (prevInput) prevInput.focus();
    }
  }

  isOtpComplete(): boolean {
    return this.otpDigits.every(d => d.trim().length === 1);
  }

  onVerifyOtp(): void {
    if (!this.isOtpComplete()) {
      this.errorMessage = 'Please enter all 6 digits of the OTP code.';
      return;
    }

    const otp = this.otpDigits.join('');
    this.loading = true;
    this.errorMessage = '';

    this.authService.loginWithPhoneOtp(this.phoneNumber, otp).subscribe({
      next: (res) => {
        this.loading = false;
        if (res && (res.success || res.accessToken || res.data?.accessToken)) {
          this.checkDriverProfileAndNavigate();
        } else if (res && res.message) {
          const msg = (res.message || '').toLowerCase();
          if (msg.includes('incomplete') || msg.includes('registration')) {
            this.authService.clearSession();
            this.router.navigate(['/onboarding'], { queryParams: { phone: this.phoneNumber } });
          } else {
            this.errorMessage = res.message;
            this.otpDigits = ['', '', '', '', '', ''];
          }
        }
      },
      error: (err) => {
        this.loading = false;
        const msg = (err.error?.message || err.message || '').toLowerCase();

        if (msg.includes('incomplete') || msg.includes('registration')) {
          this.authService.clearSession();
          this.router.navigate(['/onboarding'], { queryParams: { phone: this.phoneNumber } });
        } else {
          this.errorMessage = err.error?.message || err.message || 'Invalid OTP code entered. Please check and try again.';
          this.otpDigits = ['', '', '', '', '', ''];
        }
      }
    });
  }

  private checkDriverProfileAndNavigate(): void {
    this.driverService.getProfile().subscribe({
      next: (res) => {
        const profile = res?.data || res;
        const status = (profile?.status || '').toUpperCase();
        const vStatus = (profile?.verificationStatus || '').toUpperCase();
        const hasSubmittedDetails = profile && (profile.operationType != null || profile.city != null || profile.licenseNumber != null);

        // A profile is onboarded only if it's active/verified or pending verification WITH submitted details, and NOT DRAFT
        const isAlreadyOnboarded = profile && status !== 'DRAFT' && status !== 'INCOMPLETE' && status !== 'NEW' && (
          status === 'ACTIVE' || 
          status === 'VERIFIED' || 
          status === 'APPROVED' || 
          vStatus === 'VERIFIED' || 
          vStatus === 'APPROVED' || 
          (status === 'PENDING_VERIFICATION' && hasSubmittedDetails)
        );

        if (isAlreadyOnboarded) {
          this.router.navigate(['/dashboard']);
        } else {
          this.router.navigate(['/onboarding'], { queryParams: { phone: this.phoneNumber } });
        }
      },
      error: () => {
        this.router.navigate(['/onboarding'], { queryParams: { phone: this.phoneNumber } });
      }
    });
  }

  onGoogleLogin(): void {
    if (this.phoneNumber.length < 10) {
      this.errorMessage = 'Please enter your 10-digit mobile number to continue with Google login.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const googleEmail = `driver_${this.phoneNumber}@google.com`;
    const googleName = `Google Driver (${this.phoneNumber.slice(-4)})`;

    const payload = {
      fullName: googleName,
      phone: this.phoneNumber,
      email: googleEmail,
      status: 'PENDING_VERIFICATION'
    };

    // Check / Register as driver partner in partner_approvals
    this.authService.registerDriverPartner(payload).subscribe({
      next: (res) => {
        this.loading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        const msg = err.error?.message || err.message || '';
        if (msg.includes('already exists') || msg.includes('exists')) {
          // Account already exists with this phone or email -> execute existing login flow
          this.onSendOtp();
        } else {
          // Fallback: Proceed with OTP login flow
          this.onSendOtp();
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }
}
