import { Component, EventEmitter, Input, OnInit, Output, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { WindowRefService } from '../../../core/services/window-ref.service';
import { PaymentService } from '../../../core/services/payment.service';

@Component({
  selector: 'app-razor-pay',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './razor-pay.component.html',
  styleUrls: ['./razor-pay.component.scss'],
  providers: [WindowRefService]
})
export class RazorPayComponent implements OnInit {
  private winRef = inject(WindowRefService);
  private paymentService = inject(PaymentService);
  private platformId = inject(PLATFORM_ID);

  @Input() bookingId?: number;
  @Input() finalAmount: number = 0;
  @Input() contact: { name?: string; contact?: string; email?: string } = {};
  @Input() buttonText: string = 'Pay Now with Razorpay';
  @Input() buttonCssClass: string = 'btn-razorpay';
  @Input() disabled: boolean = false;

  @Output() paymentStatus: EventEmitter<{ success: boolean; data?: any; error?: string }> = new EventEmitter();

  key: string = '';
  isProcessing: boolean = false;
  razorpayScriptLoaded: boolean = false;

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadRazorpayScript();
      this.loadConfigData();
    }
  }

  loadRazorpayScript(): void {
    if (this.razorpayScriptLoaded || !isPlatformBrowser(this.platformId)) return;

    if (document.getElementById('razorpay-checkout-script')) {
      this.razorpayScriptLoaded = true;
      return;
    }

    const script = document.createElement('script');
    script.id = 'razorpay-checkout-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      this.razorpayScriptLoaded = true;
    };
    script.onerror = (error) => {
      console.error('Error loading Razorpay checkout script:', error);
    };

    document.head.appendChild(script);
  }

  loadConfigData(): void {
    this.paymentService.getBookingSettings().subscribe({
      next: (res) => {
        if (res.success && res.data && res.data.keyId) {
          this.key = res.data.keyId;
        } else {
          this.key = 'rzp_test_mockKey123';
        }
      },
      error: () => {
        this.key = 'rzp_test_mockKey123';
      }
    });
  }

  initiatePayment(): void {
    if (this.disabled || this.isProcessing) return;

    if (!isPlatformBrowser(this.platformId)) return;

    if (!this.winRef.nativeWindow.Razorpay) {
      alert('Razorpay payment gateway SDK is loading. Please try again in a moment.');
      this.loadRazorpayScript();
      return;
    }

    this.isProcessing = true;

    // If bookingId exists, create order on server first
    if (this.bookingId) {
      this.paymentService.createRazorpayOrder(this.bookingId).subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.openRazorpayModal({
              orderId: res.data.orderId,
              amount: res.data.amount,
              currency: res.data.currency || 'INR',
              keyId: res.data.keyId || this.key
            });
          } else {
            this.isProcessing = false;
            this.paymentStatus.emit({ success: false, error: res.message || 'Failed to create payment order' });
          }
        },
        error: (err) => {
          this.isProcessing = false;
          this.paymentStatus.emit({ success: false, error: err.error?.message || 'Server error creating order' });
        }
      });
    } else {
      // Standalone checkout without pre-created server orderId
      const amountInPaise = Math.round((this.finalAmount || 0) * 100);
      this.openRazorpayModal({
        amount: amountInPaise,
        currency: 'INR',
        keyId: this.key || 'rzp_test_mockKey123'
      });
    }
  }

  private openRazorpayModal(config: { orderId?: string; amount: number; currency: string; keyId: string }): void {
    const options: any = {
      key: config.keyId,
      amount: config.amount,
      currency: config.currency,
      name: 'Rentron JCB Booking',
      description: `Payment for Booking ${this.bookingId ? '#' + this.bookingId : ''}`,
      order_id: config.orderId,
      prefill: {
        name: this.contact?.name || 'Valued Customer',
        contact: this.contact?.contact || '',
        email: this.contact?.email || ''
      },
      notes: {
        bookingId: this.bookingId ? String(this.bookingId) : ''
      },
      theme: {
        color: '#ff6600'
      },
      modal: {
        escape: false,
        ondismiss: () => {
          this.isProcessing = false;
          this.paymentStatus.emit({ success: false, error: 'Payment cancelled by user' });
        }
      },
      handler: (response: any) => {
        this.handlePaymentSuccess(response, config.orderId);
      }
    };

    try {
      const rzp = new this.winRef.nativeWindow.Razorpay(options);
      rzp.on('payment.failed', (failedRes: any) => {
        this.isProcessing = false;
        this.paymentStatus.emit({
          success: false,
          error: failedRes.error?.description || 'Payment failed'
        });
      });
      rzp.open();
    } catch (e: any) {
      this.isProcessing = false;
      console.error('Error opening Razorpay modal:', e);
      this.paymentStatus.emit({ success: false, error: e.message || 'Razorpay launch error' });
    }
  }

  private handlePaymentSuccess(response: any, orderId?: string): void {
    if (this.bookingId && (response.razorpay_payment_id || response.razorpay_order_id)) {
      const verifyPayload = {
        bookingId: this.bookingId,
        razorpayOrderId: response.razorpay_order_id || orderId || '',
        razorpayPaymentId: response.razorpay_payment_id,
        razorpaySignature: response.razorpay_signature || ''
      };

      this.paymentService.verifyPaymentSignature(verifyPayload).subscribe({
        next: (verifyRes) => {
          this.isProcessing = false;
          if (verifyRes.success) {
            this.paymentStatus.emit({
              success: true,
              data: {
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                verified: true,
                message: verifyRes.message
              }
            });
          } else {
            this.paymentStatus.emit({
              success: false,
              error: verifyRes.message || 'Payment verification failed'
            });
          }
        },
        error: (err) => {
          this.isProcessing = false;
          this.paymentStatus.emit({
            success: false,
            error: err.error?.message || 'Server failed to verify payment'
          });
        }
      });
    } else {
      this.isProcessing = false;
      this.paymentStatus.emit({
        success: true,
        data: {
          paymentId: response.razorpay_payment_id,
          verified: false
        }
      });
    }
  }
}
