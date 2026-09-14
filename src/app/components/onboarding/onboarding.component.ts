import { Component, Input, Output, EventEmitter, inject, OnInit, HostListener, ElementRef } from '@angular/core';
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
  elementRef = inject(ElementRef);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const targetNode = event.target as Node;
    const isInsideCustomDropdown = Array.from(this.elementRef.nativeElement.querySelectorAll('.custom-dropdown'))
      .some((dropdown: any) => dropdown.contains(targetNode));

    if (!isInsideCustomDropdown) {
      this.isCityDropdownOpen = false;
      this.isLanguageDropdownOpen = false;
      this.citySearchQuery = '';
    }
  }

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

  citiesList: string[] = [
    'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Erode',
    'Tirunelveli', 'Vellore', 'Thanjavur', 'Dindigul', 'Kancheepuram', 'Tiruvannamalai',
    'Gurugram', 'Noida', 'Delhi', 'Bengaluru', 'Hyderabad', 'Mumbai',
    'Thoothukkudi', 'Nagapattinam', 'Pudukkottai', 'Krishnagiri', 'Dharmapuri', 'Kanniyakumari',
    'Rāmanāthapuram', 'Sivaganga', 'Thiruvarur', 'Theni', 'Karur', 'Ariyalur',
    'Perambalur', 'Virudhunagar', 'Tirupattur', 'Ranipet', 'Tenkasi', 'Kallakurichi',
    'Nilgiris', 'Avadi', 'Tambaram', 'Tiruvottiyur', 'Poonamallee', 'Sriperumbudur',
    'Hosur', 'Kumbakonam', 'Rajapalayam', 'Karaikkudi', 'Bodinayakanur', 'Ambur',
    'Vaniyambadi', 'Arani', 'Gudiyatham', 'Attur', 'Mettupalayam', 'Coonoor',
    'Udhagamandalam', 'Kovilpatti', 'Sivakasi'
  ];

  isCityDropdownOpen: boolean = false;
  citySearchQuery: string = '';

  get filteredCities(): string[] {
    if (!this.citySearchQuery.trim()) {
      return this.citiesList;
    }
    const query = this.citySearchQuery.toLowerCase();
    return this.citiesList.filter(c => c.toLowerCase().includes(query));
  }

  languagesList: string[] = ['English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Marathi', 'Gujarati'];
  isLanguageDropdownOpen: boolean = false;

  toggleLanguageDropdown(): void {
    this.isLanguageDropdownOpen = !this.isLanguageDropdownOpen;
    if (this.isLanguageDropdownOpen) {
      this.isCityDropdownOpen = false;
    }
  }

  selectLanguage(lang: string): void {
    this.formData.language = lang;
    this.isLanguageDropdownOpen = false;
  }

  toggleCityDropdown(): void {
    this.isCityDropdownOpen = !this.isCityDropdownOpen;
    if (this.isCityDropdownOpen) {
      this.isLanguageDropdownOpen = false;
    } else {
      this.citySearchQuery = '';
    }
  }

  selectCity(city: string): void {
    this.formData.city = city;
    this.isCityDropdownOpen = false;
    this.citySearchQuery = '';
  }

  createdDriverId?: number;

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
        const profile = (res && res.success && res.data) ? res.data : (res && res.phone ? res : null);
        if (profile) {
          const status = (profile.status || '').toUpperCase();
          if (
            status === 'PENDING_VERIFICATION' ||
            status === 'ACTIVE' ||
            status === 'VERIFIED' ||
            status === 'APPROVED' ||
            status === 'ONLINE' ||
            status === 'OFFLINE' ||
            status === 'ACTIVE_ONLINE' ||
            status === 'ACTIVE_OFFLINE'
          ) {
            this.router.navigate(['/dashboard']);
            return;
          }

          if (profile.phone) {
            const isSamePhone = !this.phone || this.phone.trim() === profile.phone.trim();
            if (isSamePhone) {
              if (profile.id) this.createdDriverId = profile.id;
              if (profile.fullName) this.formData.fullName = profile.fullName;
              if (profile.email) this.formData.email = profile.email;
              if (profile.city) this.formData.city = profile.city;
              if (profile.preferredLanguage) this.formData.language = profile.preferredLanguage;
              if (profile.operationType) this.formData.operationType = profile.operationType;
              if (profile.selectedVehicleType) this.formData.vehicleType = profile.selectedVehicleType;
              if (profile.selectedMachineryModel) this.formData.machineryModel = profile.selectedMachineryModel;
            } else {
              // New driver registration for different phone: keep input fields clean
              this.formData.fullName = '';
              this.formData.email = '';
            }
          }
        }
      }
    });
  }

  ensureDriverRegistered(callback?: () => void): void {
    if (this.createdDriverId) {
      if (callback) callback();
      return;
    }
    const payload = {
      fullName: this.formData.fullName || 'Driver',
      phone: this.phone || '',
      email: this.formData.email || '',
      experience: this.formData.experience || '3-5 years',
      city: this.formData.city || 'Chennai',
      preferredLanguage: this.formData.language || 'English',
      operationType: this.formData.operationType || 'OWN',
      selectedVehicleType: this.formData.vehicleType || 'Machinery',
      selectedMachineryModel: this.formData.machineryModel || 'JCB 3DX',
      partnerType: 'DRIVER'
    };

    this.authService.registerDriverPartner(payload).subscribe({
      next: (res) => {
        const data = res?.data || res;
        if (data && data.id) {
          this.createdDriverId = data.id;
        }
        if (callback) callback();
      },
      error: () => {
        if (callback) callback();
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

  docValidationError: string = '';

  areRequiredDocsUploaded(): boolean {
    const hasAadhaar = !!this.uploadedDocs['Aadhaar Card / Government ID'];
    const hasPhoto = !!this.uploadedDocs['Profile Photo'];
    const hasPan = !!this.uploadedDocs['PAN Card'];
    const hasLicense = !!this.uploadedDocs['Driving License / Operator License'];

    if (this.formData.operationType !== 'FLEET') {
      const hasRc = !!this.uploadedDocs['Equipment / Vehicle RC'];
      return hasAadhaar && hasPhoto && hasPan && hasLicense && hasRc;
    }
    return hasAadhaar && hasPhoto && hasPan && hasLicense;
  }

  onDocumentNext(): void {
    if (!this.areRequiredDocsUploaded()) {
      this.docValidationError = 'Please upload all mandatory documents (*Required) before proceeding.';
      return;
    }
    this.docValidationError = '';
    this.currentStep = 'BANK_DETAILS';
  }

  openUploadModal(docType: string): void {
    this.activeDocType = docType;
    this.ensureDriverRegistered(() => {
      this.showUploadModal = true;
    });
  }

  onFileCaptured(file: File): void {
    if (this.activeDocType) {
      this.uploadedDocs[this.activeDocType] = true;
      this.docValidationError = '';
      const targetId = this.createdDriverId || 0;
      this.documentService.uploadDocument(file, this.activeDocType, 'DRIVER', targetId).subscribe({
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
