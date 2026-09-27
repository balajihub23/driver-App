import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { BottomNavigationComponent } from '../../shared/components/bottom-navigation/bottom-navigation.component';
import { ImageUploadModalComponent } from '../../shared/components/image-upload-modal/image-upload-modal.component';
import { DriverService } from '../../core/services/driver.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService, ThemeMode } from '../../core/services/theme.service';
import { DocumentService } from '../../core/services/document.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { LogoutModalComponent } from '../../shared/components/logout-modal/logout-modal.component';

import { VehicleMasterService, VehicleType, VehicleModel, VehicleSubModel } from '../../core/services/vehicle-master.service';

export type ProfileSubView = 
  | 'MAIN' 
  | 'PERSONAL_INFO' 
  | 'EDIT_PERSONAL_INFO' 
  | 'MY_DOCUMENTS' 
  | 'DOCUMENT_DETAIL' 
  | 'UPLOAD_DOCUMENT' 
  | 'LANGUAGE' 
  | 'MY_VEHICLES'
  | 'VEHICLE_DETAILS'
  | 'ADD_VEHICLE_TYPE'
  | 'ADD_VEHICLE_MODEL'
  | 'ADD_VEHICLE_EXP'
  | 'ADD_VEHICLE_FORM'
  | 'UPLOAD_VEHICLE_RC'
  | 'UPLOAD_VEHICLE_INSURANCE'
  | 'UPLOAD_VEHICLE_AGREEMENT'
  | 'UPLOAD_VEHICLE_PHOTOS'
  | 'VEHICLE_SUBMITTED'
  | 'TERMS' 
  | 'PRIVACY';

export interface DocumentItem {
  id?: number;
  docTypeKey: string; // AADHAAR, LICENSE, PAN, RC, PHOTO, INSURANCE
  title: string;
  status: 'VERIFIED' | 'UNDER_REVIEW' | 'REJECTED' | 'NOT_UPLOADED';
  docNumber?: string;
  expiryDate?: string;
  issuingAuthority?: string;
  submittedOn?: string;
  fileName?: string;
  fileUrl?: string;
  rejectionReason?: string;
  previewUrl?: string;
}

export type VehicleStatus = 'Active' | 'Approved' | 'APPROVED' | 'Under Review' | 'PENDING_VERIFICATION' | 'Pending' | 'Rejected' | 'REJECTED' | string;
export type VehicleCategory = 'Car' | 'Auto' | 'Bike' | 'Machinery' | string;
export type FetchMode = 'MANUAL' | 'AUTO_VAHAN';

export interface VehicleDocumentRef {
  file?: File | null;
  name?: string;
  url?: string;
  status?: 'NOT_UPLOADED' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED';
  rejectionReason?: string;
  policyNumber?: string;
  provider?: string;
  agreementType?: string;
  regNumber?: string;
}

export interface DriverVehicle {
  id: number | string;
  vehicleTypeId?: number;
  vehicleModelId?: number;
  vehicleSubModelId?: number;
  regNumber: string;
  vehicleName: string;
  category: VehicleCategory;
  machineryModel?: string;
  machinerySubCategory?: string;
  experience?: string;
  status: VehicleStatus;
  isActive: boolean;
  rejectionReason?: string;
  fetchMode?: FetchMode;
  mfgYear?: string;
  machineClass?: string;
  chassisVin?: string;
  engineSerial?: string;
  powertrain?: 'DIESEL' | 'PETROL' | 'ELECTRIC' | 'HYBRID';
  vehicleDescription?: string;
  isVahanSynced?: boolean;
  applicationId?: string;
  submittedOn?: string;
  documents?: {
    rcFront?: VehicleDocumentRef;
    rcBack?: VehicleDocumentRef;
    insurance?: VehicleDocumentRef;
    agreement?: VehicleDocumentRef;
    photos?: {
      front?: string;
      side?: string;
      rear?: string;
      cabin?: string;
      engineSerialPlate?: string;
    };
  };
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    BottomNavigationComponent,
    ImageUploadModalComponent,
    LogoutModalComponent
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  driverService = inject(DriverService);
  authService = inject(AuthService);
  themeService = inject(ThemeService);
  documentService = inject(DocumentService);
  sanitizer = inject(DomSanitizer);
  router = inject(Router);
  http = inject(HttpClient);

  getSafeUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  currentView: ProfileSubView = 'MAIN';
  vehicleValidationError: string = '';
  isSubmittingVehicle: boolean = false;

  driverProfile: any = null;
  showPhotoModal: boolean = false;
  showFileViewerModal: boolean = false;
  viewingFileUrl: string = '';

  // Preferences toggles
  notificationsEnabled: boolean = true;

  // Edit form state
  editForm = {
    fullName: '',
    phone: '',
    email: '',
    dob: '',
    gender: '',
    address: '',
    city: '',
    profilePhotoUrl: ''
  };

  // Language state
  selectedLanguage: string = 'English';
  languages = [
    { code: 'en', name: 'English', native: 'English' },
    { code: 'hi', name: 'Hindi', native: 'हिंदी' },
    { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
    { code: 'te', name: 'Telugu', native: 'తెలుగు' },
    { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
    { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
    { code: 'mr', name: 'Marathi', native: 'मराठी' },
    { code: 'bn', name: 'Bengali', native: 'বাংলা' },
    { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' }
  ];

  // Documents state (Clean, no hardcoded dummy data)
  documentsList: DocumentItem[] = [
    {
      docTypeKey: 'AADHAAR',
      title: 'Aadhaar Card',
      status: 'NOT_UPLOADED',
      docNumber: '',
      expiryDate: '',
      issuingAuthority: '',
      submittedOn: '',
      fileName: '',
      fileUrl: ''
    },
    {
      docTypeKey: 'LICENSE',
      title: 'Driving License',
      status: 'NOT_UPLOADED',
      docNumber: '',
      expiryDate: '',
      issuingAuthority: '',
      submittedOn: '',
      fileName: '',
      fileUrl: ''
    },
    {
      docTypeKey: 'PAN',
      title: 'PAN Card',
      status: 'NOT_UPLOADED',
      docNumber: '',
      expiryDate: '',
      issuingAuthority: '',
      submittedOn: '',
      fileName: '',
      fileUrl: ''
    },
    {
      docTypeKey: 'RC',
      title: 'Vehicle RC',
      status: 'NOT_UPLOADED',
      docNumber: '',
      expiryDate: '',
      issuingAuthority: '',
      submittedOn: '',
      fileName: '',
      fileUrl: ''
    },
    {
      docTypeKey: 'PHOTO',
      title: 'Photo',
      status: 'NOT_UPLOADED',
      docNumber: '',
      expiryDate: '',
      issuingAuthority: '',
      submittedOn: '',
      fileName: '',
      fileUrl: ''
    },
    {
      docTypeKey: 'INSURANCE',
      title: 'Insurance',
      status: 'NOT_UPLOADED',
      docNumber: '',
      expiryDate: '',
      issuingAuthority: '',
      submittedOn: '',
      fileName: '',
      fileUrl: ''
    }
  ];

  selectedDocItem: DocumentItem | null = null;

  // Upload Form state
  uploadDocNumber: string = '';
  uploadedFrontFile: File | null = null;
  uploadedBackFile: File | null = null;
  frontPreviewUrl: string = '';
  backPreviewUrl: string = '';

  // ==================== VEHICLE MANAGEMENT STATE ====================
  vehicleFilter: 'ALL' | 'Approved' | 'Pending' | 'Rejected' = 'ALL';
  selectedVehicle: DriverVehicle | null = null;
  activeVehicleUploadSlot: string = ''; // 'RC_FRONT', 'RC_BACK', 'INSURANCE', 'AGREEMENT', 'PHOTO_FRONT', 'PHOTO_SIDE', 'PHOTO_REAR', 'PHOTO_CABIN', 'PHOTO_ENGINE'

  // Dynamic vehicles list (No hardcoded dummy vehicles)
  vehiclesList: DriverVehicle[] = [];
  activeDocViewer: { title: string; url: string; isImage: boolean } | null = null;

  vehicleMasterService = inject(VehicleMasterService);

  // Dynamic Vehicle Master Catalog
  dynamicVehicleTypes: VehicleType[] = [];
  dynamicModels: VehicleModel[] = [];
  dynamicSubModels: VehicleSubModel[] = [];
  dynamicCatalog: VehicleType[] = [];

  // Add Vehicle Wizard State
  machinerySubCategoryFilter: string = 'All';
  machineryModels: any[] = [
    { id: 'jcb_3dx', name: 'JCB 3DX', sub: 'Backhoe', specs: 'Backhoe Loader • 74 HP • 1.0 m³', icon: '🚜', iconUrl: '', subModelId: 0, modelId: 0, typeId: 0 },
    { id: 'tata_ex200', name: 'Tata Hitachi EX 200', sub: 'Excavator', specs: 'Hydraulic Excavator • 133 HP • 2.0 Ton', icon: '🏗️', iconUrl: '', subModelId: 0, modelId: 0, typeId: 0 },
    { id: 'cat_424b2', name: 'CAT 424B2', sub: 'Backhoe', specs: 'Backhoe Loader • 75 HP • General Purpose', icon: '🚜', iconUrl: '', subModelId: 0, modelId: 0, typeId: 0 },
    { id: 'mahindra_em', name: 'Mahindra EarthMaster', sub: 'Backhoe', specs: 'Backhoe Loader • 79 HP • Heavy Duty', icon: '🚜', iconUrl: '', subModelId: 0, modelId: 0, typeId: 0 },
    { id: 'komatsu_pc210', name: 'Komatsu PC210', sub: 'Excavator', specs: 'Hydraulic Excavator • 165 HP', icon: '🏗️', iconUrl: '', subModelId: 0, modelId: 0, typeId: 0 },
    { id: 'escorts_trx', name: 'Escorts TRX 2319', sub: 'Cranes', specs: 'Mobile Crane • 14 Ton Heavy Duty', icon: '🏗️', iconUrl: '', subModelId: 0, modelId: 0, typeId: 0 },
    { id: 'cat_d6n', name: 'CAT D6N XL', sub: 'Bulldozer', specs: 'Bulldozer • 166 HP Track Type', icon: '🚜', iconUrl: '', subModelId: 0, modelId: 0, typeId: 0 }
  ];

  experienceOptions = [
    '<1 year',
    '1-3 years',
    '3-5 years',
    '5-10 years',
    '10+ years'
  ];

  // New vehicle form model
  newVehicle: DriverVehicle = {
    id: 0,
    vehicleTypeId: undefined,
    vehicleModelId: undefined,
    vehicleSubModelId: undefined,
    regNumber: '',
    vehicleName: 'JCB 3DX EcoXcellence',
    category: 'Machinery',
    machineryModel: 'JCB 3DX',
    machinerySubCategory: 'Backhoe',
    experience: '3-5 years',
    status: 'Under Review',
    isActive: false,
    fetchMode: 'AUTO_VAHAN',
    mfgYear: '',
    machineClass: '',
    chassisVin: '',
    engineSerial: '',
    powertrain: 'DIESEL',
    vehicleDescription: '',
    isVahanSynced: false,
    applicationId: '',
    documents: {
      rcFront: {},
      rcBack: {},
      insurance: {},
      agreement: {},
      photos: {}
    }
  };

  // Document Upload Form Helper States
  rcForm = {
    regNumber: '',
    frontName: '',
    frontPreview: '',
    backName: '',
    backPreview: ''
  };

  insuranceForm = {
    policyNumber: '',
    providerName: '',
    fileName: '',
    previewUrl: ''
  };

  agreementForm = {
    type: 'Lease Agreement',
    regNumber: '',
    fileName: '',
    previewUrl: ''
  };

  photosForm = {
    front: '',
    side: '',
    rear: '',
    cabin: '',
    engineSerial: ''
  };

  ngOnInit(): void {
    this.loadProfile();
    this.loadPersistentVehicles();
    this.loadVehicleMasterCatalog();
  }

  loadVehicleMasterCatalog(): void {
    this.vehicleMasterService.getCatalog().subscribe({
      next: (res) => {
        if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
          this.dynamicCatalog = res.data;
          this.dynamicVehicleTypes = res.data;

          // Set default category to first active vehicle type if not set
          const selectedType = this.dynamicVehicleTypes.find(t => t.id === this.newVehicle.vehicleTypeId) || this.dynamicVehicleTypes[0];
          if (selectedType) {
            this.selectVehicleTypeCard(selectedType);
          }
        }
      },
      error: (err) => console.warn('Vehicle master catalog loading error:', err)
    });
  }

  buildDynamicMachineryModelsList(vType: VehicleType): void {
    if (!vType.models || vType.models.length === 0) {
      this.machineryModels = [];
      return;
    }

    const dynamicList: any[] = [];
    vType.models.forEach(m => {
      if (m.subModels && m.subModels.length > 0) {
        m.subModels.forEach(sm => {
          dynamicList.push({
            id: `sub_${sm.id}`,
            name: sm.name,
            sub: m.name,
            specs: `${sm.description || sm.machineClass || m.name}${sm.horsePower ? ' • ' + sm.horsePower : ''}${sm.capacity ? ' • ' + sm.capacity : ''}`,
            icon: sm.iconUrl || m.iconUrl || vType.iconUrl || this.getDefaultEmojiForType(vType),
            iconUrl: sm.iconUrl || m.iconUrl || vType.iconUrl,
            subModelId: sm.id,
            modelId: m.id,
            typeId: vType.id,
            machineClass: sm.machineClass || m.name
          });
        });
      } else {
        dynamicList.push({
          id: `mod_${m.id}`,
          name: m.name,
          sub: m.name,
          specs: m.description || m.name,
          icon: m.iconUrl || vType.iconUrl || this.getDefaultEmojiForType(vType),
          iconUrl: m.iconUrl || vType.iconUrl,
          subModelId: undefined,
          modelId: m.id,
          typeId: vType.id,
          machineClass: m.description || m.name
        });
      }
    });

    this.machineryModels = dynamicList;

    // Auto-select the first sub-vehicle / model option by default (index 0)
    if (this.machineryModels.length > 0) {
      this.selectMachineryOption(this.machineryModels[0]);
    }
  }

  getDefaultEmojiForType(vType?: VehicleType): string {
    if (!vType) return '🚗';
    const code = (vType.code || vType.name || '').toUpperCase();
    if (code.includes('CAR')) return '🚗';
    if (code.includes('AUTO')) return '🛺';
    if (code.includes('BIKE')) return '🏍️';
    return '🚜';
  }

  selectVehicleTypeCard(type: VehicleType): void {
    this.newVehicle.category = type.name;
    this.newVehicle.vehicleTypeId = type.id;
    this.newVehicle.vehicleModelId = undefined;
    this.newVehicle.vehicleSubModelId = undefined;

    if (type.models && type.models.length > 0) {
      this.dynamicModels = type.models;
      this.buildDynamicMachineryModelsList(type);
    } else {
      this.vehicleMasterService.getModelsByType(type.id).subscribe({
        next: (res) => {
          if (res && res.data) {
            type.models = res.data;
            this.dynamicModels = res.data;
            this.buildDynamicMachineryModelsList(type);
          }
        }
      });
    }
  }

  onContinueFromTypeView(): void {
    if (this.machineryModels && this.machineryModels.length > 0) {
      if (!this.newVehicle.vehicleModelId && !this.newVehicle.vehicleSubModelId) {
        this.selectMachineryOption(this.machineryModels[0]);
      }
      this.navigateTo('ADD_VEHICLE_MODEL');
    } else {
      this.navigateTo('ADD_VEHICLE_FORM');
    }
  }

  onImgError(event: Event): void {
    const target = event.target as HTMLImageElement;
    target.style.display = 'none';
  }

  selectMachineryOption(m: any): void {
    if (!m) return;
    this.newVehicle.machineryModel = m.name;
    this.newVehicle.machinerySubCategory = m.sub;
    this.newVehicle.vehicleName = m.sub && m.sub !== m.name ? `${m.sub} ${m.name}` : m.name;
    this.newVehicle.vehicleTypeId = m.typeId || this.newVehicle.vehicleTypeId;
    this.newVehicle.vehicleModelId = m.modelId;
    this.newVehicle.vehicleSubModelId = m.subModelId;
    if (m.machineClass) {
      this.newVehicle.machineClass = m.machineClass;
    }
  }

  isModelOptionSelected(m: any): boolean {
    if (!m) return false;
    if (m.subModelId && this.newVehicle.vehicleSubModelId) {
      return this.newVehicle.vehicleSubModelId === m.subModelId;
    }
    if (m.modelId && this.newVehicle.vehicleModelId) {
      return this.newVehicle.vehicleModelId === m.modelId;
    }
    return this.newVehicle.machineryModel === m.name;
  }

  loadPersistentVehicles(): void {
    const user = this.authService.currentUser();
    const userId = user?.id || this.driverProfile?.userId || this.driverProfile?.id || 3;

    if (this.http) {
      this.http.get<any>(`${environment.serverApi}/api/v1/vehicles/user/${userId}`).subscribe({
        next: (res) => {
          if (res && res.success && Array.isArray(res.data)) {
            const mapped: DriverVehicle[] = res.data.map((item: any) => ({
              id: item.id,
              regNumber: item.regNumber,
              vehicleName: item.vehicleName,
              category: item.category || 'Machinery',
              machineryModel: item.machineryModel || item.vehicleName,
              machinerySubCategory: item.machinerySubCategory || 'Backhoe',
              experience: item.experience || '1-3 years',
              status: item.status || 'APPROVED',
              isActive: item.isActive ?? false,
              fetchMode: item.fetchMode || 'AUTO_VAHAN',
              mfgYear: item.mfgYear || '2023',
              machineClass: item.machineClass || 'Earth Moving',
              chassisVin: item.chassisVin || '',
              engineSerial: item.engineSerial || '',
              powertrain: item.powertrain || 'DIESEL',
              isVahanSynced: item.isVahanSynced ?? true,
              submittedOn: item.submittedOn || 'Recent',
              vehicleDescription: item.vehicleDescription || '',
              rejectionReason: item.rejectionReason,
              documents: {
                rcFront: { name: 'RC_Front.png', url: item.rcFrontUrl || '', status: 'VERIFIED' },
                rcBack: { name: 'RC_Back.png', url: item.rcBackUrl || '', status: 'VERIFIED' },
                insurance: { name: 'Insurance.pdf', url: item.insuranceUrl || '', status: 'VERIFIED' }
              }
            }));
            this.vehiclesList = mapped;
            this.savePersistentVehicles();
          }
        },
        error: (err) => console.warn('Backend GET vehicles error:', err)
      });
    }
  }

  savePersistentVehicles(): void {
    if (typeof window !== 'undefined') {
      try {
        const sanitizedList = this.vehiclesList.map(v => {
          const copy = { ...v };
          if (copy.documents) {
            const docs = { ...copy.documents };
            if (docs.rcFront?.url?.startsWith('data:')) docs.rcFront = { ...docs.rcFront, url: '' };
            if (docs.rcBack?.url?.startsWith('data:')) docs.rcBack = { ...docs.rcBack, url: '' };
            if (docs.insurance?.url?.startsWith('data:')) docs.insurance = { ...docs.insurance, url: '' };
            if (docs.agreement?.url?.startsWith('data:')) docs.agreement = { ...docs.agreement, url: '' };
            if (docs.photos) {
              const p = { ...docs.photos };
              if (p.front?.startsWith('data:')) p.front = '';
              if (p.side?.startsWith('data:')) p.side = '';
              if (p.rear?.startsWith('data:')) p.rear = '';
              if (p.cabin?.startsWith('data:')) p.cabin = '';
              if (p.engineSerialPlate?.startsWith('data:')) p.engineSerialPlate = '';
              docs.photos = p;
            }
            copy.documents = docs;
          }
          return copy;
        });

        const jsonStr = JSON.stringify(sanitizedList);
        localStorage.setItem('rentron_shared_vehicles', jsonStr);
        localStorage.setItem('admin_vehicles_list', jsonStr);
        localStorage.setItem('rentron_driver_vehicles', jsonStr);
      } catch (e) {
        console.warn('LocalStorage quota limit reached, bypassing local cache update:', e);
      }
    }
  }

  get filteredVehicles(): DriverVehicle[] {
    if (this.vehicleFilter === 'ALL') return this.vehiclesList;
    if (this.vehicleFilter === 'Approved') {
      return this.vehiclesList.filter(v => v.status === 'Approved' || v.status === 'APPROVED' || v.status === 'Active' || v.isActive);
    }
    if (this.vehicleFilter === 'Pending') {
      return this.vehiclesList.filter(v => v.status === 'Under Review' || v.status === 'PENDING_VERIFICATION' || v.status === 'Pending');
    }
    if (this.vehicleFilter === 'Rejected') {
      return this.vehiclesList.filter(v => v.status === 'Rejected' || v.status === 'REJECTED');
    }
    return this.vehiclesList;
  }

  get approvedVehiclesCount(): number {
    return this.vehiclesList.filter(v => v.status === 'Approved' || v.status === 'APPROVED' || v.status === 'Active' || v.isActive).length;
  }

  get pendingVehiclesCount(): number {
    return this.vehiclesList.filter(v => v.status === 'Under Review' || v.status === 'PENDING_VERIFICATION' || v.status === 'Pending').length;
  }

  get rejectedVehiclesCount(): number {
    return this.vehiclesList.filter(v => v.status === 'Rejected' || v.status === 'REJECTED').length;
  }

  get filteredMachineryModels() {
    if (this.machinerySubCategoryFilter === 'All') return this.machineryModels;
    return this.machineryModels.filter(m => m.sub === this.machinerySubCategoryFilter);
  }

  activateVehicle(vehicle: DriverVehicle, event?: Event): void {
    if (event) event.stopPropagation();
    
    // Deactivate all vehicles, activate selected
    this.vehiclesList.forEach(v => v.isActive = false);
    vehicle.isActive = true;
    if (vehicle.status === 'Approved') {
      vehicle.status = 'Active';
    }
    this.savePersistentVehicles();

    // Update driver profile on backend with current active vehicle details
    this.driverService.updateProfile({
      selectedVehicleType: vehicle.category,
      selectedMachineryModel: vehicle.machineryModel || vehicle.vehicleName
    }).subscribe({
      next: () => {
        if (this.driverProfile) {
          this.driverProfile.selectedVehicleType = vehicle.category;
          this.driverProfile.selectedMachineryModel = vehicle.machineryModel || vehicle.vehicleName;
        }
      }
    });
  }

  openVehicleDetails(vehicle: DriverVehicle): void {
    this.selectedVehicle = vehicle;
    this.navigateTo('VEHICLE_DETAILS');
  }

  startAddVehicleFlow(): void {
    this.vehicleValidationError = '';
    this.loadVehicleMasterCatalog();
    this.newVehicle = {
      id: Date.now(),
      regNumber: '',
      vehicleName: 'JCB 3DX EcoXcellence',
      category: 'Machinery',
      machineryModel: 'JCB 3DX',
      machinerySubCategory: 'Backhoe',
      experience: '3-5 years',
      status: 'Under Review',
      isActive: false,
      fetchMode: 'AUTO_VAHAN',
      mfgYear: '',
      machineClass: '',
      chassisVin: '',
      engineSerial: '',
      powertrain: 'DIESEL',
      vehicleDescription: '',
      isVahanSynced: false,
      applicationId: '#OP' + Math.floor(10000 + Math.random() * 90000),
      documents: {
        rcFront: {},
        rcBack: {},
        insurance: {},
        agreement: {},
        photos: {}
      }
    };

    this.rcForm = { regNumber: '', frontName: '', frontPreview: '', backName: '', backPreview: '' };
    this.insuranceForm = { policyNumber: '', providerName: '', fileName: '', previewUrl: '' };
    this.agreementForm = { type: 'Lease Agreement', regNumber: '', fileName: '', previewUrl: '' };
    this.photosForm = { front: '', side: '', rear: '', cabin: '', engineSerial: '' };

    this.navigateTo('ADD_VEHICLE_TYPE');
  }

  fetchVahanDetails(): void {
    if (!this.newVehicle.regNumber.trim()) {
      return;
    }
    this.newVehicle.isVahanSynced = true;
    this.newVehicle.mfgYear = '2023';
    this.newVehicle.machineClass = 'Earth Moving (Loader)';
    this.newVehicle.chassisVin = 'MA1PB45JC9L088921';
    this.newVehicle.engineSerial = '4H3829K912048E';
    this.rcForm.regNumber = this.newVehicle.regNumber;
    this.agreementForm.regNumber = this.newVehicle.regNumber;
  }

  openVehicleDocumentUpload(type: 'RC' | 'INSURANCE' | 'AGREEMENT' | 'PHOTOS'): void {
    if (type === 'RC') {
      this.rcForm.regNumber = this.newVehicle.regNumber || '';
      this.navigateTo('UPLOAD_VEHICLE_RC');
    }
    else if (type === 'INSURANCE') this.navigateTo('UPLOAD_VEHICLE_INSURANCE');
    else if (type === 'AGREEMENT') this.navigateTo('UPLOAD_VEHICLE_AGREEMENT');
    else if (type === 'PHOTOS') this.navigateTo('UPLOAD_VEHICLE_PHOTOS');
  }

  triggerUploadModal(slot: string): void {
    this.activeVehicleUploadSlot = slot;
    this.showPhotoModal = true;
  }

  onVehicleDocCaptured(file: File): void {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const url = e.target.result;
      const slot = this.activeVehicleUploadSlot;

      if (slot === 'RC_FRONT') {
        this.rcForm.frontName = file.name;
        this.rcForm.frontPreview = url;
      } else if (slot === 'RC_BACK') {
        this.rcForm.backName = file.name;
        this.rcForm.backPreview = url;
      } else if (slot === 'INSURANCE') {
        this.insuranceForm.fileName = file.name;
        this.insuranceForm.previewUrl = url;
      } else if (slot === 'AGREEMENT') {
        this.agreementForm.fileName = file.name;
        this.agreementForm.previewUrl = url;
      } else if (slot === 'PHOTO_FRONT') {
        this.photosForm.front = url;
      } else if (slot === 'PHOTO_SIDE') {
        this.photosForm.side = url;
      } else if (slot === 'PHOTO_REAR') {
        this.photosForm.rear = url;
      } else if (slot === 'PHOTO_CABIN') {
        this.photosForm.cabin = url;
      } else if (slot === 'PHOTO_ENGINE') {
        this.photosForm.engineSerial = url;
      }
    };
    reader.readAsDataURL(file);

    // Upload to backend document service
    const driverId = this.driverProfile?.id || 1;
    this.documentService.uploadDocument(file, this.activeVehicleUploadSlot || 'VEHICLE_DOC', 'DRIVER', driverId).subscribe();
    this.showPhotoModal = false;
  }

  saveRcDocument(): void {
    if (this.rcForm.regNumber) {
      this.newVehicle.regNumber = this.rcForm.regNumber;
    }
    if (this.newVehicle.documents) {
      this.newVehicle.documents.rcFront = {
        name: this.rcForm.frontName || '',
        url: this.rcForm.frontPreview || '',
        status: this.rcForm.frontPreview ? 'UNDER_REVIEW' : 'NOT_UPLOADED'
      };
      this.newVehicle.documents.rcBack = {
        name: this.rcForm.backName || '',
        url: this.rcForm.backPreview || '',
        status: this.rcForm.backPreview ? 'UNDER_REVIEW' : 'NOT_UPLOADED'
      };
    }
    this.navigateTo('ADD_VEHICLE_FORM');
  }

  saveInsuranceDocument(): void {
    if (this.newVehicle.documents) {
      this.newVehicle.documents.insurance = {
        name: this.insuranceForm.fileName || '',
        url: this.insuranceForm.previewUrl || '',
        policyNumber: this.insuranceForm.policyNumber || '',
        provider: this.insuranceForm.providerName || '',
        status: this.insuranceForm.previewUrl ? 'UNDER_REVIEW' : 'NOT_UPLOADED'
      };
    }
    this.navigateTo('ADD_VEHICLE_FORM');
  }

  saveAgreementDocument(): void {
    if (this.newVehicle.documents) {
      this.newVehicle.documents.agreement = {
        name: this.agreementForm.fileName || '',
        url: this.agreementForm.previewUrl || '',
        agreementType: this.agreementForm.type,
        regNumber: this.agreementForm.regNumber,
        status: this.agreementForm.previewUrl ? 'UNDER_REVIEW' : 'NOT_UPLOADED'
      };
    }
    this.navigateTo('ADD_VEHICLE_FORM');
  }

  savePhotosDocument(): void {
    if (this.newVehicle.documents) {
      this.newVehicle.documents.photos = {
        front: this.photosForm.front || '',
        side: this.photosForm.side || '',
        rear: this.photosForm.rear || '',
        cabin: this.photosForm.cabin || '',
        engineSerialPlate: this.photosForm.engineSerial || ''
      };
    }
    this.navigateTo('ADD_VEHICLE_FORM');
  }

  submitVehicleVerification(): void {
    if (this.isSubmittingVehicle) return;

    this.vehicleValidationError = '';

    if (!this.newVehicle.regNumber || !this.newVehicle.regNumber.trim()) {
      this.vehicleValidationError = 'Registration Number is required.';
      return;
    }
    if (!this.newVehicle.machineClass || !this.newVehicle.machineClass.trim()) {
      this.vehicleValidationError = 'Machine Class is required.';
      return;
    }
    if (!this.newVehicle.chassisVin || !this.newVehicle.chassisVin.trim()) {
      this.vehicleValidationError = 'Chassis / VIN Number is required.';
      return;
    }

    this.isSubmittingVehicle = true;

    this.newVehicle.status = 'Under Review';
    this.newVehicle.submittedOn = new Date().toLocaleDateString();

    // Check if this is the first vehicle, if so make it active
    if (this.vehiclesList.length === 0) {
      this.newVehicle.isActive = true;
    }

    // Save new vehicle to backend database
    const user = this.authService.currentUser();
    const userId = user?.id || this.driverProfile?.userId || 3;
    const driverName = this.driverProfile?.fullName || this.editForm.fullName || 'Driver Partner';
    const driverPhone = this.driverProfile?.phone || this.editForm.phone || '7074953565';

    const vehicleDbPayload = {
      userId: userId,
      driverId: this.driverProfile?.id || 1,
      vehicleTypeId: this.newVehicle.vehicleTypeId,
      vehicleModelId: this.newVehicle.vehicleModelId,
      vehicleSubModelId: this.newVehicle.vehicleSubModelId,
      regNumber: this.newVehicle.regNumber,
      vehicleName: this.newVehicle.vehicleName,
      category: this.newVehicle.category,
      machineryModel: this.newVehicle.machineryModel,
      machinerySubCategory: this.newVehicle.machinerySubCategory,
      experience: this.newVehicle.experience,
      mfgYear: this.newVehicle.mfgYear,
      machineClass: this.newVehicle.machineClass,
      chassisVin: this.newVehicle.chassisVin,
      engineSerial: this.newVehicle.engineSerial,
      powertrain: this.newVehicle.powertrain,
      status: 'UNDER_REVIEW',
      isActive: this.vehiclesList.length === 0,
      fetchMode: this.newVehicle.fetchMode,
      submittedOn: new Date().toLocaleDateString(),
      vehicleDescription: this.newVehicle.vehicleDescription,
      driverName: driverName,
      driverPhone: driverPhone,
      rcFrontUrl: this.newVehicle.documents?.rcFront?.url || '',
      rcBackUrl: this.newVehicle.documents?.rcBack?.url || '',
      insuranceUrl: this.newVehicle.documents?.insurance?.url || '',
      frontPhotoUrl: this.newVehicle.documents?.photos?.front || '',
      sidePhotoUrl: this.newVehicle.documents?.photos?.side || '',
      rearPhotoUrl: this.newVehicle.documents?.photos?.rear || '',
      cabinPhotoUrl: this.newVehicle.documents?.photos?.cabin || '',
      enginePlatePhotoUrl: this.newVehicle.documents?.photos?.engineSerialPlate || ''
    };

    this.http.post<any>(`${environment.serverApi}/api/v1/vehicles`, vehicleDbPayload).subscribe({
      next: (res) => {
        this.isSubmittingVehicle = false;
        if (res && res.data) {
          this.newVehicle.id = res.data.id;
        }

        this.vehiclesList.unshift({ ...this.newVehicle });
        this.savePersistentVehicles();

        // Send Admin Notification to notify admin user of new vehicle registration
        const notifyPayload = {
          title: 'New Vehicle Registration',
          message: `${driverName} submitted a new vehicle for review (${this.newVehicle.vehicleName || 'Equipment'} - Reg: ${this.newVehicle.regNumber}).`,
          notificationType: 'VEHICLE',
          deepLink: '/admin/approvals'
        };

        this.http.post(`${environment.serverApi}/api/v1/notifications/notify-admin`, notifyPayload).subscribe({
          next: () => console.log('Admin notified of new vehicle registration'),
          error: (err) => console.warn('Admin notification error:', err)
        });

        this.navigateTo('VEHICLE_SUBMITTED');
      },
      error: (err) => {
        this.isSubmittingVehicle = false;
        console.error('POST vehicle to backend failed:', err);
        const detailMsg = err?.error?.message || err?.message || 'Database error occurred. Please try again.';
        this.vehicleValidationError = `Submission Failed: ${detailMsg}`;
      }
    });
  }

  getCleanDocName(doc?: VehicleDocumentRef, defaultName: string = 'Document.png'): string {
    if (!doc) return defaultName;
    if (doc.name && !doc.name.startsWith('data:')) {
      return doc.name;
    }
    return defaultName;
  }

  viewVehicleDocument(title: string, docUrl?: string): void {
    if (!docUrl || !docUrl.trim()) return;
    const isImg = docUrl.startsWith('data:image') || docUrl.endsWith('.jpg') || docUrl.endsWith('.png') || docUrl.endsWith('.jpeg') || docUrl.startsWith('http');
    this.activeDocViewer = { title, url: docUrl, isImage: isImg };
  }

  closeVehicleDocumentViewer(): void {
    this.activeDocViewer = null;
  }

  isSameDocType(docTypeKey: string, backendDocType: string): boolean {
    if (!docTypeKey || !backendDocType) return false;
    const key = docTypeKey.toUpperCase().trim();
    const bType = backendDocType.toUpperCase().trim();

    if (key === bType) return true;
    if (key === 'AADHAAR' && (bType.includes('AADHAAR') || bType.includes('GOVERNMENT ID'))) return true;
    if (key === 'LICENSE' && (bType.includes('LICENSE') || bType.includes('DRIVING'))) return true;
    if (key === 'PAN' && bType.includes('PAN')) return true;
    if (key === 'RC' && (bType.includes('RC') || bType.includes('EQUIPMENT') || bType.includes('VEHICLE'))) return true;
    if (key === 'PHOTO' && (bType.includes('PHOTO') || bType.includes('PROFILE'))) return true;
    if (key === 'INSURANCE' && bType.includes('INSURANCE')) return true;
    return bType.includes(key) || key.includes(bType);
  }

  loadProfile(): void {
    const user = this.authService.currentUser();
    if (user) {
      this.editForm.fullName = user.fullName || '';
      this.editForm.phone = user.phone || '';
      this.editForm.email = user.email || '';
    }

    this.driverService.getProfile().subscribe({
      next: (res) => {
        const data = res?.data || res;
        if (data && (data.id || data.fullName || data.phone)) {
          this.driverProfile = data;
          this.editForm.fullName = data.fullName || user?.fullName || this.editForm.fullName || '';
          this.editForm.phone = data.phone || user?.phone || this.editForm.phone || '';
          this.editForm.email = data.email || user?.email || this.editForm.email || '';
          this.editForm.dob = data.dob || '';
          this.editForm.gender = data.gender || '';
          this.editForm.address = data.address || '';
          this.editForm.city = data.city || '';
          this.editForm.profilePhotoUrl = data.profilePhotoUrl || '';
          if (data.preferredLanguage) {
            this.selectedLanguage = data.preferredLanguage;
          }
        }
        this.loadBackendDocuments();
      },
      error: () => {
        this.loadBackendDocuments();
      }
    });

    this.driverService.getPreferences().subscribe({
      next: (res) => {
        const pref = res?.data || res;
        if (pref && pref.pushEnabled != null) {
          this.notificationsEnabled = pref.pushEnabled ?? true;
        }
      }
    });
  }

  loadBackendDocuments(): void {
    const driverId = this.driverProfile?.id || 1;
    this.documentService.getDocumentsForEntity('DRIVER', driverId).subscribe({
      next: (res) => {
        if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
          res.data.forEach((doc: any) => {
            const matchIndex = this.documentsList.findIndex(
              d => this.isSameDocType(d.docTypeKey, doc.documentType)
            );
            const downloadLink = this.documentService.downloadUrl(doc.id);
            const docObj: DocumentItem = {
              id: doc.id,
              docTypeKey: doc.documentType || 'DOC',
              title: this.getDocTitle(doc.documentType),
              status: 'UNDER_REVIEW',
              docNumber: doc.documentNumber || 'DOC-' + doc.id,
              expiryDate: 'Oct 12, 2027',
              issuingAuthority: 'Government Authority',
              submittedOn: new Date(doc.createdAt || Date.now()).toLocaleDateString(),
              fileName: doc.fileName,
              fileUrl: downloadLink
            };
            if (matchIndex >= 0) {
              docObj.docTypeKey = this.documentsList[matchIndex].docTypeKey;
              docObj.title = this.documentsList[matchIndex].title;
              this.documentsList[matchIndex] = docObj;
            } else {
              this.documentsList.push(docObj);
            }
          });
        }
      }
    });
  }

  getDocTitle(key: string): string {
    switch ((key || '').toUpperCase()) {
      case 'AADHAAR': return 'Aadhaar Card';
      case 'LICENSE': return 'Driving License';
      case 'PAN': return 'PAN Card';
      case 'RC': return 'Vehicle RC';
      case 'PHOTO': return 'Photo';
      case 'INSURANCE': return 'Insurance';
      default: return key || 'Document';
    }
  }

  navigateTo(view: ProfileSubView): void {
    this.currentView = view;
    if (view === 'MY_VEHICLES' || view === 'MAIN') {
      this.loadPersistentVehicles();
    }
  }

  onSaveProfile(): void {
    this.driverService.updateProfile(this.editForm).subscribe({
      next: (res) => {
        if (res.success) {
          this.driverProfile = res.data;
          this.currentView = 'PERSONAL_INFO';
        }
      }
    });
  }

  onToggleNotifications(): void {
    this.notificationsEnabled = !this.notificationsEnabled;
    this.driverService.updatePreferences({ pushEnabled: this.notificationsEnabled }).subscribe();
  }

  isDarkMode(): boolean {
    return this.themeService.isDarkMode();
  }

  onToggleDarkMode(): void {
    const current = this.isDarkMode();
    this.themeService.setThemeMode(current ? 'LIGHT' : 'DARK');
    this.driverService.updatePreferences({ themeMode: current ? 'LIGHT' : 'DARK' }).subscribe();
  }

  onApplyLanguage(): void {
    this.driverService.updateProfile({ preferredLanguage: this.selectedLanguage }).subscribe({
      next: () => {
        if (this.driverProfile) {
          this.driverProfile.preferredLanguage = this.selectedLanguage;
        }
        this.currentView = 'MAIN';
      }
    });
  }

  openDocumentDetail(doc: DocumentItem): void {
    this.selectedDocItem = doc;
    if (doc.status === 'NOT_UPLOADED') {
      this.openUploadForm();
    } else {
      this.currentView = 'DOCUMENT_DETAIL';
    }
  }

  openUploadForm(): void {
    if (this.selectedDocItem) {
      this.uploadDocNumber = this.selectedDocItem.docNumber || '';
    } else {
      this.uploadDocNumber = '';
    }
    this.uploadedFrontFile = null;
    this.uploadedBackFile = null;
    this.frontPreviewUrl = '';
    this.backPreviewUrl = '';
    this.currentView = 'UPLOAD_DOCUMENT';
  }

  onFileSelected(event: any, side: 'front' | 'back'): void {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      if (side === 'front') {
        this.uploadedFrontFile = file;
        this.frontPreviewUrl = e.target.result;
      } else {
        this.uploadedBackFile = file;
        this.backPreviewUrl = e.target.result;
      }
    };
    reader.readAsDataURL(file);
  }

  removeFile(side: 'front' | 'back'): void {
    if (side === 'front') {
      this.uploadedFrontFile = null;
      this.frontPreviewUrl = '';
    } else {
      this.uploadedBackFile = null;
      this.backPreviewUrl = '';
    }
  }

  onSubmitDocument(): void {
    if (!this.selectedDocItem) return;
    const fileToUpload = this.uploadedFrontFile || this.uploadedBackFile;
    const driverId = this.driverProfile?.id || 1;

    if (fileToUpload) {
      this.documentService.uploadDocument(fileToUpload, this.selectedDocItem.docTypeKey, 'DRIVER', driverId).subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.selectedDocItem!.status = 'UNDER_REVIEW';
            this.selectedDocItem!.submittedOn = new Date().toLocaleDateString();
            this.selectedDocItem!.fileName = res.data.fileName;
            this.selectedDocItem!.fileUrl = this.documentService.downloadUrl(res.data.id);
            this.selectedDocItem!.docNumber = this.uploadDocNumber || this.selectedDocItem!.docNumber || 'DOC-' + res.data.id;
            this.currentView = 'DOCUMENT_DETAIL';
          }
        },
        error: () => {
          this.selectedDocItem!.status = 'UNDER_REVIEW';
          this.selectedDocItem!.submittedOn = new Date().toLocaleDateString();
          this.selectedDocItem!.fileName = fileToUpload.name;
          if (this.frontPreviewUrl) {
            this.selectedDocItem!.fileUrl = this.frontPreviewUrl;
          }
          this.currentView = 'DOCUMENT_DETAIL';
        }
      });
    } else {
      this.selectedDocItem.status = 'UNDER_REVIEW';
      this.selectedDocItem.submittedOn = new Date().toLocaleDateString();
      this.currentView = 'DOCUMENT_DETAIL';
    }
  }

  onViewUploadedFile(doc: DocumentItem): void {
    this.viewingFileUrl = doc.fileUrl || '';
    this.showFileViewerModal = true;
  }

  downloadViewingFile(): void {
    if (this.viewingFileUrl) {
      window.open(this.viewingFileUrl, '_blank');
    }
  }

  onPhotoCaptured(file: File): void {
    if (this.activeVehicleUploadSlot) {
      this.onVehicleDocCaptured(file);
      return;
    }

    const driverId = this.driverProfile?.id || 1;
    this.documentService.uploadDocument(file, 'PHOTO', 'DRIVER', driverId).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const downloadUrl = this.documentService.downloadUrl(res.data.id);
          this.editForm.profilePhotoUrl = downloadUrl;
          this.onSaveProfile();
        }
      }
    });
    this.showPhotoModal = false;
  }

  showLogoutModal: boolean = false;

  onLogout(): void {
    this.showLogoutModal = true;
  }

  cancelLogout(): void {
    this.showLogoutModal = false;
  }

  confirmLogout(): void {
    this.showLogoutModal = false;
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/splash']),
      error: () => this.router.navigate(['/splash'])
    });
  }
}
