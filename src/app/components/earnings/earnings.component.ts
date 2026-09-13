import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BottomNavigationComponent } from '../../shared/components/bottom-navigation/bottom-navigation.component';
import { DriverService } from '../../core/services/driver.service';

@Component({
  selector: 'app-earnings',
  standalone: true,
  imports: [CommonModule, FormsModule, BottomNavigationComponent],
  templateUrl: './earnings.component.html',
  styleUrl: './earnings.component.scss'
})
export class EarningsComponent implements OnInit {
  driverService = inject(DriverService);

  earningsData: any = null;
  bankAccount: any = null;
  bankAccounts: any[] = [];
  withdrawals: any[] = [];

  showBankModal: boolean = false;
  showWithdrawModal: boolean = false;
  withdrawAmount: number | null = null;
  selectedBankAccountId: number | null = null;

  withdrawErrorText: string = '';
  withdrawSuccessText: string = '';
  isSubmittingWithdrawal: boolean = false;
  isSubmittingBank: boolean = false;

  bankForm = {
    bankName: 'HDFC Bank',
    accountHolderName: '',
    accountNumberMasked: '',
    ifscCode: '',
    upiId: '',
    isPrimary: false
  };

  bankNameOptions = [
    'HDFC Bank',
    'ICICI Bank',
    'State Bank of India',
    'Axis Bank',
    'Kotak Mahindra Bank',
    'Punjab National Bank',
    'Bank of Baroda',
    'Canara Bank',
    'UPI Account',
    'Other Bank'
  ];

  ngOnInit(): void {
    this.loadEarnings();
    this.loadBankAccounts();
  }

  loadEarnings(): void {
    this.driverService.getEarningsSummary().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.earningsData = res.data;
          this.withdrawals = res.data.withdrawals || [];
          if (res.data.bankAccounts && res.data.bankAccounts.length > 0) {
            this.bankAccounts = res.data.bankAccounts;
            this.updatePrimaryBankAccount();
          }
          if (this.showWithdrawModal) {
            this.validateWithdrawAmount();
          }
        }
      }
    });
  }

  loadBankAccounts(): void {
    this.driverService.getBankAccounts().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.bankAccounts = res.data;
          this.updatePrimaryBankAccount();
        }
      }
    });
  }

  private updatePrimaryBankAccount(): void {
    if (this.bankAccounts.length > 0) {
      const primary = this.bankAccounts.find(a => a.isPrimary) || this.bankAccounts[0];
      this.bankAccount = primary;
      if (!this.selectedBankAccountId && primary) {
        this.selectedBankAccountId = primary.id;
      }
    } else {
      this.bankAccount = null;
      this.selectedBankAccountId = null;
    }
  }

  hasBankAccount(): boolean {
    return this.bankAccounts.length > 0;
  }

  getWithdrawableBalance(): number {
    return this.earningsData?.withdrawableAmount || 0;
  }

  openWithdrawModal(): void {
    this.showWithdrawModal = true;
    this.withdrawAmount = null;
    this.withdrawSuccessText = '';
    if (this.bankAccounts.length > 0 && !this.selectedBankAccountId) {
      const primary = this.bankAccounts.find(a => a.isPrimary) || this.bankAccounts[0];
      this.selectedBankAccountId = primary ? primary.id : null;
    }
    this.validateWithdrawAmount();
  }

  openBankModalFromWithdraw(): void {
    this.showWithdrawModal = false;
    this.resetBankForm();
    this.showBankModal = true;
  }

  resetBankForm(): void {
    this.bankForm = {
      bankName: 'HDFC Bank',
      accountHolderName: '',
      accountNumberMasked: '',
      ifscCode: '',
      upiId: '',
      isPrimary: this.bankAccounts.length === 0
    };
  }

  validateWithdrawAmount(): boolean {
    this.withdrawSuccessText = '';

    if (!this.hasBankAccount()) {
      this.withdrawErrorText = '⚠️ Bank details required: Please link a bank account or UPI ID first before requesting a withdrawal.';
      return false;
    }

    if (!this.selectedBankAccountId) {
      this.withdrawErrorText = '⚠️ Please select a bank account to receive the withdrawal.';
      return false;
    }

    if (this.getWithdrawableBalance() <= 0) {
      this.withdrawErrorText = '⚠️ You currently have ₹0 withdrawable balance available.';
      return false;
    }

    if (this.withdrawAmount === null || this.withdrawAmount === undefined || isNaN(this.withdrawAmount)) {
      this.withdrawErrorText = '⚠️ Please enter a withdrawal amount.';
      return false;
    }

    if (this.withdrawAmount <= 0) {
      this.withdrawErrorText = '⚠️ Please enter an amount greater than ₹0.';
      return false;
    }

    if (this.withdrawAmount > this.getWithdrawableBalance()) {
      this.withdrawErrorText = `⚠️ Amount (₹${this.withdrawAmount}) cannot exceed your available withdrawable balance (₹${this.getWithdrawableBalance()}).`;
      return false;
    }

    this.withdrawErrorText = '';
    return true;
  }

  onSaveBank(): void {
    if (!this.bankForm.accountHolderName || (!this.bankForm.accountNumberMasked && !this.bankForm.upiId)) {
      alert('Please fill in account holder name and either bank account number or UPI ID.');
      return;
    }

    this.isSubmittingBank = true;
    this.driverService.saveBankAccount(this.bankForm).subscribe({
      next: (res) => {
        this.isSubmittingBank = false;
        if (res.success && res.data) {
          this.showBankModal = false;
          this.loadBankAccounts();
          this.loadEarnings();
          this.resetBankForm();
        }
      },
      error: () => {
        this.isSubmittingBank = false;
      }
    });
  }

  onDeleteBankAccount(id: number): void {
    if (confirm('Are you sure you want to remove this bank account?')) {
      this.driverService.deleteBankAccount(id).subscribe({
        next: (res) => {
          if (res.success) {
            this.loadBankAccounts();
            this.loadEarnings();
          }
        }
      });
    }
  }

  onSetPrimaryBankAccount(id: number): void {
    this.driverService.setPrimaryBankAccount(id).subscribe({
      next: (res) => {
        if (res.success) {
          this.loadBankAccounts();
        }
      }
    });
  }

  onRequestWithdrawal(): void {
    if (!this.validateWithdrawAmount() || !this.withdrawAmount || this.isSubmittingWithdrawal) return;

    this.isSubmittingWithdrawal = true;
    this.withdrawErrorText = '';
    this.withdrawSuccessText = '';

    this.driverService.requestWithdrawal(this.withdrawAmount, this.selectedBankAccountId).subscribe({
      next: (res) => {
        this.isSubmittingWithdrawal = false;
        if (res && res.success) {
          this.withdrawSuccessText = `✓ Withdrawal request of ₹${this.withdrawAmount} submitted successfully! Admin will process your payout.`;
          this.withdrawAmount = null;
          this.loadEarnings();
          setTimeout(() => {
            this.showWithdrawModal = false;
            this.withdrawSuccessText = '';
          }, 1800);
        } else {
          this.withdrawErrorText = res.message || 'Failed to submit withdrawal request.';
        }
      },
      error: (err) => {
        this.isSubmittingWithdrawal = false;
        this.withdrawErrorText = err.error?.message || 'Failed to submit withdrawal request. Please try again.';
      }
    });
  }
}
