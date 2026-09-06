import { Component, Input, Output, EventEmitter, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DriverService } from '../../core/services/driver.service';
import { DocumentService } from '../../core/services/document.service';
import { ImageUploadModalComponent } from '../../shared/components/image-upload-modal/image-upload-modal.component';

export type OnboardingStep = 
  | 'PROFILE_FORM' 
  | 'VEHICLE_SELECTION' 
  | 'MACHINERY_SELECTION' 
  | 'OPERATION_TYPE' 
  | 'FLEET_INFO' 
  | 'DOCUMENT_CHECKLIST' 
  | 'BANK_DETAILS' 
  | 'TERMS' 
  | 'SUBMITTED';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule, ImageUploadModalComponent],
  templateUrl: './onboarding.component.html',
  styleUrl: './onboarding.component.scss'
})
export class OnboardingComponent implements OnInit {
  @Input() phone: string = '';
  @Output() onboardingCompleted = new EventEmitter<void>();

  authService = inject(AuthService);
  driverService = inject(DriverService);
  documentService = inject(DocumentService);
  router = inject(Router);
  route = inject(ActivatedRoute);

  currentStep: OnboardingStep = 'PROFILE_FORM';

  formData = {
    fullName: '',
    email: '',
    city: 'Gurugram',
    language: 'English',
    referralCode: '',
    vehicleType: 'Machinery',
    machineryModel: 'JCB 3DX',
    experience: '3-5 years',
    operationType: 'OWN',
    bankHolder: '',
    bankAccountNo: '',
    bankIfsc: '',
    bankUpi: ''
  };

  uploadedDocs: { [key: string]: boolean } = {};
  showUploadModal: boolean = false;
  activeDocType: string = '';

  termsAgreed: boolean = false;
  safetyAgreed: boolean = false;
  validAgreed: boolean = false;
  loading: boolean = false;

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['step'] === 'SUBMITTED') {
        this.currentStep = 'SUBMITTED';
      }
      if (params['phone']) {
        this.phone = params['phone'];
      }
    });

    this.driverService.getProfile().subscribe({
      next: (res) => {
        const profile = res?.data || res;
        if (profile) {
          if (profile.fullName) this.formData.fullName = profile.fullName;
          if (profile.email) this.formData.email = profile.email;
          if (profile.phone && !this.phone) this.phone = profile.phone;
          if (profile.city) this.formData.city = profile.city;
          if (profile.preferredLanguage) this.formData.language = profile.preferredLanguage;
          if (profile.operationType) this.formData.operationType = profile.operationType;
          if (profile.selectedVehicleType) this.formData.vehicleType = profile.selectedVehicleType;
          if (profile.selectedMachineryModel) this.formData.machineryModel = profile.selectedMachineryModel;
        }
      }
    });
  }

  getStepTitle(): string {
    switch (this.currentStep) {
      case 'PROFILE_FORM': return 'Step 1 of 5';
      case 'VEHICLE_SELECTION': return 'Step 2 of 5';
      case 'MACHINERY_SELECTION': return 'Step 2 of 5';
      case 'OPERATION_TYPE': return 'Step 3 of 5';
      case 'FLEET_INFO': return 'Step 3 of 5';
      case 'DOCUMENT_CHECKLIST': return 'Step 4 of 5';
      case 'BANK_DETAILS': return 'Step 4 of 5';
      case 'TERMS': return 'Step 5 of 5';
      default: return '';
    }
  }

  goBack(): void {
    if (this.currentStep === 'PROFILE_FORM') this.router.navigate(['/auth']);
    else if (this.currentStep === 'VEHICLE_SELECTION') this.currentStep = 'PROFILE_FORM';
    else if (this.currentStep === 'MACHINERY_SELECTION') this.currentStep = 'VEHICLE_SELECTION';
    else if (this.currentStep === 'OPERATION_TYPE') this.currentStep = 'VEHICLE_SELECTION';
    else if (this.currentStep === 'FLEET_INFO') this.currentStep = 'OPERATION_TYPE';
    else if (this.currentStep === 'DOCUMENT_CHECKLIST') this.currentStep = 'OPERATION_TYPE';
    else if (this.currentStep === 'BANK_DETAILS') this.currentStep = 'DOCUMENT_CHECKLIST';
    else if (this.currentStep === 'TERMS') this.currentStep = 'BANK_DETAILS';
  }

  onVehicleSelected(): void {
    if (this.formData.vehicleType === 'Machinery') {
      this.currentStep = 'MACHINERY_SELECTION';
    } else {
      this.currentStep = 'OPERATION_TYPE';
    }
  }

  onOperationTypeNext(): void {
    if (this.formData.operationType === 'FLEET') {
      this.currentStep = 'FLEET_INFO';
    } else {
      this.currentStep = 'DOCUMENT_CHECKLIST';
    }
  }

  openUploadModal(docType: string): void {
    this.activeDocType = docType;
    this.showUploadModal = true;
  }

  onFileCaptured(file: File): void {
    if (this.activeDocType) {
      this.uploadedDocs[this.activeDocType] = true;
      this.documentService.uploadDocument(file, this.activeDocType).subscribe({
        next: () => {},
        error: () => {}
      });
    }
  }

  onCompleteRegistration(): void {
    this.loading = true;

    const payload = {
      fullName: this.formData.fullName,
      phone: this.phone || '',
      email: this.formData.email,
      experience: this.formData.experience,
      city: this.formData.city,
      preferredLanguage: this.formData.language,
      operationType: this.formData.operationType,
      selectedVehicleType: this.formData.vehicleType,
      selectedMachineryModel: this.formData.machineryModel
    };

    this.authService.registerDriverPartner(payload).subscribe({
      next: () => {
        this.loading = false;
        this.currentStep = 'SUBMITTED';
      },
      error: () => {
        this.loading = false;
        this.currentStep = 'SUBMITTED';
      }
    });
  }

  onGoToHome(): void {
    this.router.navigate(['/dashboard']);
  }
}
