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
  withdrawals: any[] = [];

  showBankModal: boolean = false;
  showWithdrawModal: boolean = false;
  withdrawAmount: number = 0;

  bankForm = {
    accountHolderName: '',
    accountNumberMasked: '',
    ifscCode: '',
    upiId: ''
  };

  ngOnInit(): void {
    this.loadEarnings();
    this.loadBank();
  }

  loadEarnings(): void {
    this.driverService.getEarningsSummary().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.earningsData = res.data;
          this.withdrawals = res.data.withdrawals || [];
        }
      }
    });
  }

  loadBank(): void {
    this.driverService.getBankAccount().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.bankAccount = res.data;
        }
      }
    });
  }

  onSaveBank(): void {
    this.driverService.saveBankAccount(this.bankForm).subscribe({
      next: (res) => {
        if (res.success) {
          this.bankAccount = res.data;
          this.showBankModal = false;
        }
      }
    });
  }

  onRequestWithdrawal(): void {
    if (!this.withdrawAmount || this.withdrawAmount <= 0) return;
    this.driverService.requestWithdrawal(this.withdrawAmount).subscribe({
      next: (res) => {
        if (res.success) {
          this.showWithdrawModal = false;
          this.loadEarnings();
        }
      }
    });
  }
}
