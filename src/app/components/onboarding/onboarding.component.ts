import { Component, Input, Output, EventEmitter, inject, OnInit, HostListener, ElementRef, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DriverService } from '../../core/services/driver.service';
import { DocumentService } from '../../core/services/document.service';
import { ImageUploadModalComponent } from '../../shared/components/image-upload-modal/image-upload-modal.component';

import { VehicleMasterService, VehicleType } from '../../core/services/vehicle-master.service';

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
  vehicleMasterService = inject(VehicleMasterService);
  router = inject(Router);
  route = inject(ActivatedRoute);
  elementRef = inject(ElementRef);
  platformId = inject(PLATFORM_ID);

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
    city: 'Chennai',
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

  // Dynamic Catalog state for vehicle selection & machinery selection
  dynamicVehicleTypes: VehicleType[] = [];
  dynamicMachineryModels: any[] = [];
  machinerySubTabs: string[] = ['Backhoe', 'Excavator', 'Cranes', 'Bulldozer'];
  activeMachineryTab: string = 'Backhoe';

  fallbackVehicleTypes = [
    { id: 1, name: 'Car', icon: '🚗', description: 'Drive passengers' },
    { id: 2, name: 'Auto', icon: '🛺', description: 'Drive passengers' },
    { id: 3, name: 'Bike', icon: '🛵', description: 'Take bike taxi trips' },
    { id: 4, name: 'Machinery', icon: '🚜', description: 'Operate construction machinery' }
  ];

  fallbackMachineryModels = [
    { id: 'm1', name: 'JCB 3DX', sub: 'Backhoe', specs: 'Backhoe Loader • 74 HP • 1.0 m³' },
    { id: 'm2', name: 'Tata Hitachi EX 200', sub: 'Excavator', specs: 'Hydraulic Excavator • 133 HP • 2.0 Ton' },
    { id: 'm3', name: 'CAT 424B2', sub: 'Backhoe', specs: 'Backhoe Loader • 75 HP • General Purpose' },
    { id: 'm4', name: 'Mahindra EarthMaster', sub: 'Backhoe', specs: 'Backhoe Loader • 79 HP • Heavy Duty' },
    { id: 'm5', name: 'Komatsu PC210', sub: 'Excavator', specs: 'Hydraulic Excavator • 165 HP' }
  ];

  loadVehicleCatalog(): void {
    this.vehicleMasterService.getCatalog().subscribe({
      next: (res) => {
        if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
          this.dynamicVehicleTypes = res.data;
          this.buildMachineryModelsFromCatalog(res.data);
        }
      },
      error: () => {}
    });
  }

  selectVehicleTypeCard(vType: any): void {
    this.formData.vehicleType = vType.name;
    if (vType.models && vType.models.length > 0) {
      this.buildMachineryModelsFromType(vType);
    }
  }

  buildMachineryModelsFromType(vType: VehicleType): void {
    if (!vType.models || vType.models.length === 0) return;
    const list: any[] = [];
    const tabsSet = new Set<string>();

    vType.models.forEach(m => {
      tabsSet.add(m.name);
      if (m.subModels && m.subModels.length > 0) {
        m.subModels.forEach(sm => {
          list.push({
            id: `sub_${sm.id}`,
            name: sm.name,
            sub: m.name,
            specs: `${sm.description || m.name}${sm.horsePower ? ' • ' + sm.horsePower : ''}`
          });
        });
      } else {
        list.push({
          id: `mod_${m.id}`,
          name: m.name,
          sub: m.name,
          specs: m.description || m.name
        });
      }
    });

    if (list.length > 0) {
      this.dynamicMachineryModels = list;
    }
    if (tabsSet.size > 0) {
      this.machinerySubTabs = Array.from(tabsSet);
      this.activeMachineryTab = this.machinerySubTabs[0];
    }
  }

  buildMachineryModelsFromCatalog(types: VehicleType[]): void {
    const machineryType = types.find(t => t.name.toLowerCase().includes('machinery')) || types[0];
    if (!machineryType || !machineryType.models) return;

    this.buildMachineryModelsFromType(machineryType);
  }

  get filteredMachineryModels(): any[] {
    const list = this.dynamicMachineryModels.length > 0 ? this.dynamicMachineryModels : this.fallbackMachineryModels;
    if (!this.activeMachineryTab) return list;
    const tab = this.activeMachineryTab.toLowerCase();
    const filtered = list.filter(m => (m.sub || '').toLowerCase() === tab || (m.name || '').toLowerCase().includes(tab));
    return filtered.length > 0 ? filtered : list;
  }

  getVehicleIcon(typeName: string): string {
    const lower = (typeName || '').toLowerCase();
    if (lower.includes('car')) return '🚗';
    if (lower.includes('auto')) return '🛺';
    if (lower.includes('bike')) return '🛵';
    return '🚜';
  }

  getVehicleDescription(typeName: string): string {
    const lower = (typeName || '').toLowerCase();
    if (lower.includes('car')) return 'Drive passengers';
    if (lower.includes('auto')) return 'Drive passengers';
    if (lower.includes('bike')) return 'Take bike taxi trips';
    if (lower.includes('machinery')) return 'Operate construction machinery';
    return `Operate ${typeName}`;
  }

  ngOnInit(): void {
    this.loadVehicleCatalog();

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
          const hasSubmittedDetails = !!profile.operationType || !!profile.city || !!profile.licenseNumber;

          if (
            status !== 'DRAFT' &&
            status !== 'INCOMPLETE' &&
            status !== 'NEW' &&
            (
              status === 'ACTIVE' ||
              status === 'VERIFIED' ||
              status === 'APPROVED' ||
              status === 'ONLINE' ||
              status === 'OFFLINE' ||
              status === 'ACTIVE_ONLINE' ||
              status === 'ACTIVE_OFFLINE' ||
              (status === 'PENDING_VERIFICATION' && hasSubmittedDetails)
            )
          ) {
            this.router.navigate(['/dashboard']);
            return;
          }

          if (profile.phone) {
            const isSamePhone = !this.phone || this.phone.trim() === profile.phone.trim();
            if (isSamePhone) {
              if (profile.id) this.createdDriverId = profile.id;

              // Preserve locally typed values when navigating back
              if (profile.fullName && profile.fullName !== 'Driver' && !profile.fullName.startsWith('Driver (')) {
                if (!this.formData.fullName) {
                  this.formData.fullName = profile.fullName;
                }
              }
              if (profile.email && !profile.email.startsWith('driver_') && !profile.email.endsWith('@rentron.com')) {
                if (!this.formData.email) {
                  this.formData.email = profile.email;
                }
              }
              if (profile.city && (!this.formData.city || this.formData.city === 'Chennai')) {
                this.formData.city = profile.city;
              }
              if (profile.preferredLanguage) this.formData.language = profile.preferredLanguage;
              if (profile.operationType) {
                this.formData.operationType = profile.operationType;
                if (isPlatformBrowser(this.platformId)) {
                  localStorage.setItem('operationType', profile.operationType);
                }
              }
              if (profile.selectedRole) {
                if (isPlatformBrowser(this.platformId)) {
                  localStorage.setItem('selectedRole', profile.selectedRole);
                }
              }
              if (profile.selectedVehicleType) this.formData.vehicleType = profile.selectedVehicleType;
              if (profile.selectedMachineryModel) this.formData.machineryModel = profile.selectedMachineryModel;
            } else {
              if (!this.formData.fullName) this.formData.fullName = '';
              if (!this.formData.email) this.formData.email = '';
            }
          }
        }
      }
    });
  }

  ensureDriverRegistered(callback?: () => void): void {
    const roleFromStorage = isPlatformBrowser(this.platformId) ? localStorage.getItem('selectedRole') : 'DRIVER';
    const opTypeFromStorage = isPlatformBrowser(this.platformId) ? localStorage.getItem('operationType') : 'OWN';

    const payload = {
      fullName: this.formData.fullName || 'Driver',
      phone: this.phone || '',
      email: this.formData.email || '',
      experience: this.formData.experience || '3-5 years',
      city: this.formData.city || 'Chennai',
      preferredLanguage: this.formData.language || 'English',
      operationType: this.formData.operationType || opTypeFromStorage || 'OWN',
      selectedRole: roleFromStorage || 'DRIVER',
      selectedVehicleType: this.formData.vehicleType || 'Machinery',
      selectedMachineryModel: this.formData.machineryModel || 'JCB 3DX',
      partnerType: 'DRIVER'
    };

    if (this.createdDriverId) {
      this.driverService.updateProfile(payload).subscribe({
        next: () => { if (callback) callback(); },
        error: () => { if (callback) callback(); }
      });
      return;
    }

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

  onProfileFormNext(): void {
    const roleFromStorage = isPlatformBrowser(this.platformId) ? localStorage.getItem('selectedRole') : 'DRIVER';
    const opTypeFromStorage = isPlatformBrowser(this.platformId) ? localStorage.getItem('operationType') : 'OWN';

    const updatePayload = {
      fullName: this.formData.fullName,
      phone: this.phone || '',
      email: this.formData.email,
      city: this.formData.city || 'Chennai',
      preferredLanguage: this.formData.language || 'English',
      operationType: this.formData.operationType || opTypeFromStorage || 'OWN',
      selectedRole: roleFromStorage || 'DRIVER'
    };

    this.ensureDriverRegistered(() => {
      this.driverService.updateProfile(updatePayload).subscribe({
        next: () => {},
        error: () => {}
      });
    });

    this.currentStep = 'VEHICLE_SELECTION';
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
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('selectedVehicleType', this.formData.vehicleType || '');
    }
    const updatePayload = {
      selectedVehicleType: this.formData.vehicleType,
      selectedMachineryModel: this.formData.machineryModel
    };
    this.driverService.updateProfile(updatePayload).subscribe({ next: () => {}, error: () => {} });

    if (this.formData.vehicleType === 'Machinery') {
      this.currentStep = 'MACHINERY_SELECTION';
    } else {
      this.currentStep = 'OPERATION_TYPE';
    }
  }

  onOperationTypeNext(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('operationType', this.formData.operationType);
    }
    const updatePayload = {
      operationType: this.formData.operationType
    };
    this.driverService.updateProfile(updatePayload).subscribe({ next: () => {}, error: () => {} });

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

    return hasAadhaar && hasPhoto && hasPan;
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
      selectedMachineryModel: this.formData.machineryModel,
      bankHolder: this.formData.bankHolder,
      bankAccountNo: this.formData.bankAccountNo,
      bankIfsc: this.formData.bankIfsc,
      bankUpi: this.formData.bankUpi
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
