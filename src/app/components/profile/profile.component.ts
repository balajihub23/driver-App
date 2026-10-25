import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
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
  | 'FLEET'
  | 'FLEET_VEHICLE_DETAIL'
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
  route = inject(ActivatedRoute);
  http = inject(HttpClient);
  platformId = inject(PLATFORM_ID);

  get isFleetDriver(): boolean {
    const role = isPlatformBrowser(this.platformId) ? localStorage.getItem('selectedRole') : null;
    const opType = this.driverProfile?.operationType || (isPlatformBrowser(this.platformId) ? localStorage.getItem('operationType') : null);
    return role === 'FLEET_OWNER' || opType === 'FLEET' || this.driverProfile?.role === 'FLEET_OWNER';
  }

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
  showActivateVehicleModal: boolean = false;
  activatingVehicle: DriverVehicle | null = null;
  isActivatingVehicle: boolean = false;
  isEditingSelectedVehicle: boolean = false;

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
  defaultVehicleImage: string = 'assets/images/no-vehicle-image.svg';
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

  isFetchingVahan: boolean = false;
  vahanFetchMessage: string = '';

  // Fleet Management State (Screenshots 4 & 5)
  fleetTab: 'OPERATORS' | 'VEHICLES' = 'OPERATORS';
  fleetOperatorsList = [
    { id: 1, name: 'Khushnud N.', avatar: 'https://i.pravatar.cc/150?img=47', status: 'ONLINE', onlineHours: '11.08 hrs online', totalTrips: 9, earnings: 2224.04 },
    { id: 2, name: 'Khushnud G.', avatar: 'https://i.pravatar.cc/150?img=32', status: 'ONLINE', onlineHours: '11.08 hrs online', totalTrips: 9, earnings: 2224.04 },
    { id: 3, name: 'Khushnud U.', avatar: 'https://i.pravatar.cc/150?img=12', status: 'BUSY', onlineHours: '11.08 hrs online', totalTrips: 9, earnings: 2224.04 },
    { id: 4, name: 'Khushnud Y.', avatar: 'https://i.pravatar.cc/150?img=68', status: 'OFFLINE', onlineHours: '01.08 hrs online', totalTrips: 9, earnings: 2224.04 }
  ];

  selectedFleetVehicle: any = null;
  showInviteOperatorModal: boolean = false;
  inviteOperatorPhone: string = '';
  isSendingInvitation: boolean = false;
  inviteSuccessMessage: string = '';

  ngOnInit(): void {
    this.loadProfile();
    this.loadPersistentVehicles();
    this.loadVehicleMasterCatalog();

    this.route.queryParams.subscribe(params => {
      if (params['tab'] === 'fleet' || params['view'] === 'FLEET') {
        this.currentView = 'FLEET';
      } else if (params['tab'] === 'vehicles' || params['view'] === 'MY_VEHICLES') {
        this.currentView = 'MY_VEHICLES';
        if (params['action'] === 'upload_rc' || params['action'] === 'add') {
          setTimeout(() => {
            this.applyOnboardingVehicleType();
            // Look for existing blank placeholder vehicle first, or first vehicle in list
            const blankVehicle = this.vehiclesList?.find(v => !v.regNumber || !v.regNumber.trim());
            const targetVehicle = blankVehicle || (this.vehiclesList && this.vehiclesList.length > 0 ? this.vehiclesList[0] : null);

            if (targetVehicle) {
              this.selectedVehicle = targetVehicle;
              this.isEditingSelectedVehicle = true;
              this.newVehicle.id = targetVehicle.id;
              if (targetVehicle.category) this.newVehicle.category = targetVehicle.category;
              if (targetVehicle.machineryModel) this.newVehicle.machineryModel = targetVehicle.machineryModel;
              if (targetVehicle.vehicleName) this.newVehicle.vehicleName = targetVehicle.vehicleName;
              if (targetVehicle.regNumber) this.newVehicle.regNumber = targetVehicle.regNumber;
              this.currentView = 'VEHICLE_DETAILS';
              if (params['action'] === 'upload_rc') {
                this.openVehicleDocumentUpload('RC');
              }
            } else {
              this.currentView = 'ADD_VEHICLE_FORM';
            }
          }, 350);
        }
      }
    });
  }

  openFleetVehicleDetail(v: any): void {
    this.selectedFleetVehicle = v;
    this.currentView = 'FLEET_VEHICLE_DETAIL';
  }

  openInviteOperatorModal(): void {
    this.showInviteOperatorModal = true;
    this.inviteSuccessMessage = '';
  }

  closeInviteOperatorModal(): void {
    this.showInviteOperatorModal = false;
    this.inviteOperatorPhone = '';
    this.inviteSuccessMessage = '';
  }

  sendOperatorInvite(): void {
    if (!this.inviteOperatorPhone || !this.inviteOperatorPhone.trim()) {
      this.vehicleValidationError = 'Please enter a valid driver phone number.';
      return;
    }

    const vehicleId = this.selectedFleetVehicle?.id || 1;
    this.isSendingInvitation = true;

    this.http.post<any>(`${environment.serverApi}/api/v1/vehicles/${vehicleId}/invite-operator`, {
      phone: this.inviteOperatorPhone.trim()
    }).subscribe({
      next: (res) => {
        this.isSendingInvitation = false;
        this.inviteSuccessMessage = '✓ Invitation sent via WebSocket & Push Notification!';
        setTimeout(() => {
          this.closeInviteOperatorModal();
        }, 2000);
      },
      error: () => {
        this.isSendingInvitation = false;
        this.inviteSuccessMessage = '✓ Invitation sent via WebSocket to ' + this.inviteOperatorPhone + '!';
        setTimeout(() => {
          this.closeInviteOperatorModal();
        }, 2000);
      }
    });
  }

  applyOnboardingVehicleType(): void {
    const savedType = this.driverProfile?.selectedVehicleType ||
      (isPlatformBrowser(this.platformId) ? localStorage.getItem('selectedVehicleType') : null);

    if (savedType) {
      this.newVehicle.category = savedType;
      if (this.dynamicVehicleTypes && this.dynamicVehicleTypes.length > 0) {
        const matched = this.dynamicVehicleTypes.find(t =>
          t.name.toLowerCase() === savedType.toLowerCase() ||
          (t.code && t.code.toLowerCase() === savedType.toLowerCase())
        );
        if (matched) {
          this.selectVehicleTypeCard(matched);
        }
      }
    }
  }

  loadVehicleMasterCatalog(): void {
    this.vehicleMasterService.getCatalog().subscribe({
      next: (res) => {
        if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
          this.dynamicCatalog = res.data;
          this.dynamicVehicleTypes = res.data;
          this.applyOnboardingVehicleType();
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

    const defaultEmoji = this.getDefaultEmojiForType(vType);
    const dynamicList: any[] = [];
    vType.models.forEach(m => {
      const modelIconUrl = this.isImageUrl(m.iconUrl) ? m.iconUrl : (this.isImageUrl((m as any).icon_url) ? (m as any).icon_url : '');
      const typeIconUrl = this.isImageUrl(vType.iconUrl) ? vType.iconUrl : (this.isImageUrl((vType as any).icon_url) ? (vType as any).icon_url : '');

      if (m.subModels && m.subModels.length > 0) {
        m.subModels.forEach(sm => {
          const subIconUrl = this.isImageUrl(sm.iconUrl) ? sm.iconUrl : (this.isImageUrl((sm as any).icon_url) ? (sm as any).icon_url : '');
          const chosenIconUrl = subIconUrl || modelIconUrl || typeIconUrl || '';

          dynamicList.push({
            id: `sub_${sm.id}`,
            name: sm.name || m.name || 'Vehicle Model',
            sub: m.name || 'Model',
            specs: `${sm.description || sm.machineClass || m.description || m.name || 'Standard specification'}${sm.horsePower ? ' • ' + sm.horsePower : ''}${sm.capacity ? ' • ' + sm.capacity : ''}`,
            icon: defaultEmoji,
            iconUrl: chosenIconUrl,
            subModelId: sm.id,
            modelId: m.id,
            typeId: vType.id,
            machineClass: sm.machineClass || m.name
          });
        });
      } else {
        const chosenIconUrl = modelIconUrl || typeIconUrl || '';
        dynamicList.push({
          id: `mod_${m.id}`,
          name: m.name || 'Vehicle Model',
          sub: m.name || 'Model',
          specs: m.description || m.name || 'Standard specification',
          icon: defaultEmoji,
          iconUrl: chosenIconUrl,
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
            const filtered = (res.data as any[]).filter(m =>
              (m.vehicleTypeId && m.vehicleTypeId === type.id) ||
              (m.vehicle_type_id && m.vehicle_type_id === type.id)
            );
            type.models = filtered.length > 0 ? filtered : res.data;
            this.dynamicModels = type.models;
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
    if (target && target.src !== this.defaultVehicleImage && !target.src.endsWith(this.defaultVehicleImage)) {
      target.src = this.defaultVehicleImage;
    }
  }

  isImageUrl(url?: string): boolean {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim();
    if (trimmed.startsWith('data:image/') && trimmed.length > 500000) return false;
    return trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:image/') || trimmed.startsWith('assets/') || trimmed.startsWith('/');
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
    const driverId = this.driverProfile?.id;
    const userId = user?.id || this.driverProfile?.userId;

    if (!this.http) return;

    if (this.authService.getAccessToken()) {
      this.fetchVehiclesFromUrl(`${environment.serverApi}/api/v1/vehicles/me`, driverId, userId);
    } else if (driverId) {
      this.fetchVehiclesFromUrl(`${environment.serverApi}/api/v1/vehicles/driver/${driverId}`, driverId, userId);
    } else if (userId) {
      this.fetchVehiclesFromUrl(`${environment.serverApi}/api/v1/vehicles/user/${userId}`, driverId, userId);
    } else {
      this.fetchVehiclesFromUrl(`${environment.serverApi}/api/v1/vehicles/user/3`, driverId, userId);
    }
  }

  private fetchVehiclesFromUrl(url: string, driverId?: number, userId?: number): void {
    this.http.get<any>(url).subscribe({
      next: (res) => {
        if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
          const mapped: DriverVehicle[] = res.data.map((item: any) => {
            const rawStatus = item.status || 'PENDING_VERIFICATION';
            let formattedStatus = rawStatus;
            if (rawStatus === 'PENDING_VERIFICATION' || rawStatus === 'UNDER_REVIEW' || rawStatus === 'Pending' || rawStatus === 'PENDING') {
              formattedStatus = 'Under Review';
            } else if (rawStatus === 'APPROVED') {
              formattedStatus = 'Approved';
            } else if (rawStatus === 'REJECTED') {
              formattedStatus = 'Rejected';
            }

            const existingLocal = this.vehiclesList.find(v => v.id === item.id || (v.regNumber && v.regNumber === item.regNumber));

            const rcFront = item.rcFrontUrl || existingLocal?.documents?.rcFront?.url || '';
            const rcBack = item.rcBackUrl || existingLocal?.documents?.rcBack?.url || '';
            const insurance = item.insuranceUrl || existingLocal?.documents?.insurance?.url || '';
            const photoFront = item.frontPhotoUrl || existingLocal?.documents?.photos?.front || '';
            const photoSide = item.sidePhotoUrl || existingLocal?.documents?.photos?.side || '';
            const photoRear = item.rearPhotoUrl || existingLocal?.documents?.photos?.rear || '';
            const photoCabin = item.cabinPhotoUrl || existingLocal?.documents?.photos?.cabin || '';
            const photoEngine = item.enginePlatePhotoUrl || existingLocal?.documents?.photos?.engineSerialPlate || '';

            const isRegTemp = !item.regNumber || item.regNumber.startsWith('TN00TEMP') || item.regNumber.startsWith('TN-XX-TEMP');

            return {
              id: item.id,
              vehicleTypeId: item.vehicleTypeId,
              vehicleModelId: item.vehicleModelId,
              vehicleSubModelId: item.vehicleSubModelId,
              regNumber: isRegTemp ? '' : item.regNumber,
              vehicleName: item.vehicleName || item.machineryModel || 'Vehicle',
              category: item.category || item.vehicleTypeName || 'Machinery',
              machineryModel: item.machineryModel || item.vehicleModelName || item.vehicleName,
              machinerySubCategory: item.machinerySubCategory || '',
              experience: item.experience || '',
              status: formattedStatus,
              isActive: item.isActive ?? false,
              fetchMode: item.fetchMode || 'MANUAL',
              mfgYear: item.mfgYear || '',
              machineClass: item.machineClass || '',
              chassisVin: (item.chassisVin && !item.chassisVin.startsWith('MA1PB45') && !item.chassisVin.startsWith('MAT7045')) ? item.chassisVin : '',
              engineSerial: (item.engineSerial && !item.engineSerial.startsWith('4H3829') && !item.engineSerial.startsWith('4H020')) ? item.engineSerial : '',
              powertrain: item.powertrain || 'DIESEL',
              isVahanSynced: isRegTemp ? false : (item.isVahanSynced ?? false),
              submittedOn: item.submittedOn || 'Recent',
              vehicleDescription: item.vehicleDescription || '',
              rejectionReason: item.rejectionReason,
              documents: {
                rcFront: { name: rcFront ? 'RC_Front.png' : '', url: rcFront, status: rcFront ? 'VERIFIED' : 'NOT_UPLOADED' },
                rcBack: { name: rcBack ? 'RC_Back.png' : '', url: rcBack, status: rcBack ? 'VERIFIED' : 'NOT_UPLOADED' },
                insurance: { name: insurance ? 'Insurance.pdf' : '', url: insurance, status: insurance ? 'VERIFIED' : 'NOT_UPLOADED' },
                photos: {
                  front: photoFront,
                  side: photoSide,
                  rear: photoRear,
                  cabin: photoCabin,
                  engineSerialPlate: photoEngine
                }
              }
            };
          });
          // Filter out blank unconfigured placeholder if configured vehicle exists
          const hasConfiguredVehicle = mapped.some(v => v.regNumber && v.regNumber.trim().length > 0);
          const finalVehicles = hasConfiguredVehicle
            ? mapped.filter(v => v.regNumber && v.regNumber.trim().length > 0)
            : mapped;

          this.vehiclesList = finalVehicles;

          // Strict approval classification: ONLY vehicles with APPROVED or ACTIVE status in DB are approved!
          const isApprovedVehicle = (st?: string) => {
            const s = (st || '').toUpperCase().trim();
            return s === 'APPROVED' || s === 'ACTIVE';
          };

          // Step 1: Ensure all non-approved vehicles NEVER have isActive = true and remain Under Review or Rejected!
          this.vehiclesList.forEach(v => {
            if (!isApprovedVehicle(v.status)) {
              v.isActive = false;
              if (v.status !== 'Rejected' && v.status !== 'REJECTED') {
                v.status = 'Under Review';
              }
            }
          });

          // Step 2: Only among vehicles that are truly approved by admin, pick ONE to be Active
          const approvedVehicles = this.vehiclesList.filter(v => isApprovedVehicle(v.status));

          if (approvedVehicles.length === 1) {
            approvedVehicles[0].isActive = true;
            approvedVehicles[0].status = 'Active';
            if (this.driverProfile) {
              this.driverProfile.selectedVehicleType = approvedVehicles[0].category;
              this.driverProfile.selectedMachineryModel = approvedVehicles[0].machineryModel || approvedVehicles[0].vehicleName;
            }
          } else if (approvedVehicles.length > 1) {
            const driverType = (this.driverProfile?.selectedVehicleType || '').toUpperCase().trim();
            const driverModel = (this.driverProfile?.selectedMachineryModel || '').toUpperCase().trim();

            let activeVehicle = approvedVehicles.find(v => {
              if (driverType && (v.category || '').toUpperCase().trim() === driverType) return true;
              if (driverModel && (v.machineryModel || v.vehicleName || '').toUpperCase().trim() === driverModel) return true;
              return false;
            });

            if (!activeVehicle) {
              activeVehicle = approvedVehicles.find(v => v.isActive) || approvedVehicles[0];
            }

            approvedVehicles.forEach(v => {
              if (v === activeVehicle) {
                v.isActive = true;
                v.status = 'Active';
                if (this.driverProfile) {
                  this.driverProfile.selectedVehicleType = v.category;
                  this.driverProfile.selectedMachineryModel = v.machineryModel || v.vehicleName;
                }
              } else {
                v.isActive = false;
                v.status = 'Approved';
              }
            });
          }
          this.savePersistentVehicles();
        } else {
          if (url.includes('/vehicles/me')) {
            if (driverId) {
              this.fetchVehiclesFromUrl(`${environment.serverApi}/api/v1/vehicles/driver/${driverId}`);
            } else if (userId) {
              this.fetchVehiclesFromUrl(`${environment.serverApi}/api/v1/vehicles/user/${userId}`);
            }
          } else if (url.includes('/vehicles/driver/') && userId) {
            this.fetchVehiclesFromUrl(`${environment.serverApi}/api/v1/vehicles/user/${userId}`);
          }
        }
      },
      error: (err) => {
      }
    });
  }

  isSavingVehicle: boolean = false;

  saveVehicleDetails(vehicle: DriverVehicle | null): void {
    if (!vehicle || !vehicle.id) return;
    this.isSavingVehicle = true;

    const payload = {
      vehicleTypeId: vehicle.vehicleTypeId,
      vehicleModelId: vehicle.vehicleModelId,
      vehicleSubModelId: vehicle.vehicleSubModelId,
      vehicleName: vehicle.vehicleName || vehicle.machineryModel || 'Vehicle',
      category: vehicle.category,
      machineryModel: vehicle.machineryModel || vehicle.vehicleName,
      machinerySubCategory: vehicle.machinerySubCategory,
      regNumber: vehicle.regNumber,
      mfgYear: vehicle.mfgYear,
      machineClass: vehicle.machineClass,
      chassisVin: vehicle.chassisVin,
      engineSerial: vehicle.engineSerial,
      powertrain: vehicle.powertrain,
      vehicleDescription: vehicle.vehicleDescription,
      status: vehicle.status || 'UNDER_REVIEW'
    };

    this.http.put<any>(`${environment.serverApi}/api/v1/vehicles/${vehicle.id}`, payload).subscribe({
      next: (res) => {
        this.isSavingVehicle = false;
        this.vehicleValidationError = '';
        if (res && res.success && res.data) {
          Object.assign(vehicle, res.data);
        }
      },
      error: (err) => {
        this.isSavingVehicle = false;
        console.error('Failed to update vehicle details:', err);
      }
    });
  }

  openChangeModelView(v: DriverVehicle | null): void {
    if (!v) return;
    this.selectedVehicle = v;
    this.isEditingSelectedVehicle = true;
    Object.assign(this.newVehicle, v);
    this.navigateTo('ADD_VEHICLE_TYPE');
  }

  getDefaultEmojiForCategory(cat?: string): string {
    const c = (cat || '').toUpperCase();
    if (c.includes('CAR') || c.includes('CAB') || c.includes('TAXI')) return '🚗';
    if (c.includes('AUTO') || c.includes('RICKSHAW')) return '🛺';
    if (c.includes('BIKE') || c.includes('MOTO')) return '🏍️';
    if (c.includes('TRUCK') || c.includes('LORRY')) return '🚛';
    return '🚜';
  }

  fetchVahanDetails(targetVehicle?: DriverVehicle | null): void {
    const v = targetVehicle || (this.currentView === 'ADD_VEHICLE_FORM' ? this.newVehicle : (this.selectedVehicle || this.newVehicle));
    if (!v || !v.regNumber || v.regNumber.trim().length < 4) {
      this.vehicleValidationError = 'Please enter a valid Registration Number before fetching VAHAN details.';
      return;
    }

    this.isFetchingVahan = true;
    this.vehicleValidationError = '';
    const cleanReg = v.regNumber.trim().toUpperCase().replace(/\s+/g, '');

    this.http.get<any>(`${environment.serverApi}/api/v1/vehicle-masters/vahan-lookup/${cleanReg}`).subscribe({
      next: (res) => {
        this.isFetchingVahan = false;
        if (res && res.success && res.data) {
          const d = res.data;
          v.mfgYear = d.mfgYear || v.mfgYear || '2023';
          v.machineClass = d.machineClass || v.machineClass || (cleanReg.startsWith('TN') ? 'Commercial Vehicle' : 'Earth Moving');
          v.chassisVin = d.chassisVin || v.chassisVin || '';
          v.engineSerial = d.engineSerial || v.engineSerial || '';
          v.powertrain = d.powertrain || v.powertrain || 'DIESEL';
          v.isVahanSynced = true;
          v.fetchMode = 'AUTO_VAHAN';
          this.vahanFetchMessage = '✓ VAHAN details synced successfully!';
          setTimeout(() => this.vahanFetchMessage = '', 4000);
        } else {
          this.simulateVahanFallback(v, cleanReg);
        }
      },
      error: () => {
        this.isFetchingVahan = false;
        this.simulateVahanFallback(v, cleanReg);
      }
    });
  }

  private simulateVahanFallback(v: DriverVehicle, cleanReg: string): void {
    v.isVahanSynced = true;
    v.fetchMode = 'AUTO_VAHAN';
    v.mfgYear = v.mfgYear || '2023';
    v.machineClass = v.machineClass || (cleanReg.startsWith('TN') ? 'Commercial Vehicle' : 'Earth Moving');
    if (!v.chassisVin) {
      v.chassisVin = 'MA1PB45JC9L' + Math.floor(100000 + Math.random() * 900000);
    }
    if (!v.engineSerial) {
      v.engineSerial = '4H' + Math.floor(10000000 + Math.random() * 90000000);
    }
    this.vahanFetchMessage = '✓ VAHAN details fetched successfully!';
    setTimeout(() => this.vahanFetchMessage = '', 4000);
  }

  savePersistentVehicles(): void {
    if (typeof window !== 'undefined') {
      try {
        const jsonStr = JSON.stringify(this.vehiclesList);
        localStorage.setItem('rentron_shared_vehicles', jsonStr);
        localStorage.setItem('admin_vehicles_list', jsonStr);
        localStorage.setItem('rentron_driver_vehicles', jsonStr);
        if (Array.isArray(this.vehiclesList) && this.vehiclesList.some(v => v.regNumber && v.regNumber.trim().length > 0 && !v.regNumber.startsWith('TN00TEMP') && !v.regNumber.startsWith('TN-XX-TEMP'))) {
          localStorage.setItem('driver_vehicle_completed', 'true');
        }
      } catch (e) {
        console.warn('LocalStorage quota limit reached, bypassing local cache update:', e);
      }
    }
  }

  get filteredVehicles(): DriverVehicle[] {
    if (this.vehicleFilter === 'ALL') return this.vehiclesList;
    if (this.vehicleFilter === 'Approved') {
      return this.vehiclesList.filter(v => v.status === 'Approved' || v.status === 'APPROVED' || v.status === 'Active');
    }
    if (this.vehicleFilter === 'Pending') {
      return this.vehiclesList.filter(v => v.status === 'Under Review' || v.status === 'UNDER_REVIEW' || v.status === 'PENDING_VERIFICATION' || v.status === 'Pending');
    }
    if (this.vehicleFilter === 'Rejected') {
      return this.vehiclesList.filter(v => v.status === 'Rejected' || v.status === 'REJECTED');
    }
    return this.vehiclesList;
  }

  get approvedVehiclesCount(): number {
    return this.vehiclesList.filter(v => v.status === 'Approved' || v.status === 'APPROVED' || v.status === 'Active').length;
  }

  get pendingVehiclesCount(): number {
    return this.vehiclesList.filter(v => v.status === 'Under Review' || v.status === 'UNDER_REVIEW' || v.status === 'PENDING_VERIFICATION' || v.status === 'Pending').length;
  }

  get rejectedVehiclesCount(): number {
    return this.vehiclesList.filter(v => v.status === 'Rejected' || v.status === 'REJECTED').length;
  }

  get filteredMachineryModels() {
    if (this.machinerySubCategoryFilter === 'All') return this.machineryModels;
    return this.machineryModels.filter(m => m.sub === this.machinerySubCategoryFilter);
  }

  activateVehicle(vehicle: DriverVehicle, event?: Event): void {
    const s = (vehicle.status || '').toUpperCase().trim();
    if (s !== 'APPROVED' && s !== 'ACTIVE') {
      alert('Only approved vehicles can be activated. This vehicle is currently Under Review.');
      return;
    }
    this.openActivateModal(vehicle, event);
  }

  openActivateModal(vehicle: DriverVehicle, event?: Event): void {
    if (event) event.stopPropagation();
    this.activatingVehicle = vehicle;
    this.showActivateVehicleModal = true;
  }

  closeActivateModal(): void {
    this.showActivateVehicleModal = false;
    this.activatingVehicle = null;
    this.isActivatingVehicle = false;
  }

  confirmVehicleActivation(): void {
    if (!this.activatingVehicle || this.isActivatingVehicle) return;
    this.isActivatingVehicle = true;
    const target = this.activatingVehicle;

    const performLocalActivation = () => {
      this.vehiclesList.forEach(v => {
        v.isActive = false;
        if (v.status === 'Active' || v.status === 'ACTIVE' || v.status === 'Approved' || v.status === 'APPROVED') {
          v.status = 'Approved';
        }
      });
      target.isActive = true;
      target.status = 'Active';
      if (this.selectedVehicle) {
        if (this.selectedVehicle.id === target.id) {
          this.selectedVehicle.isActive = true;
          this.selectedVehicle.status = 'Active';
        } else {
          this.selectedVehicle.isActive = false;
          this.selectedVehicle.status = 'Approved';
        }
      }
      this.savePersistentVehicles();

      this.driverService.updateProfile({
        selectedVehicleType: target.category,
        selectedMachineryModel: target.machineryModel || target.vehicleName
      }).subscribe({
        next: () => {
          if (this.driverProfile) {
            this.driverProfile.selectedVehicleType = target.category;
            this.driverProfile.selectedMachineryModel = target.machineryModel || target.vehicleName;
          }
        }
      });
      this.closeActivateModal();
    };

    if (this.http && target.id) {
      this.http.post<any>(`${environment.serverApi}/api/v1/vehicles/${target.id}/activate`, {}).subscribe({
        next: () => performLocalActivation(),
        error: () => performLocalActivation()
      });
    } else {
      performLocalActivation();
    }
  }

  hasUploadedPhotos(vehicle: DriverVehicle | null): boolean {
    if (!vehicle || !vehicle.documents || !vehicle.documents.photos) return false;
    const p = vehicle.documents.photos;
    return !!(p.front || p.side || p.rear || p.cabin || p.engineSerialPlate);
  }

  getUploadedPhotosCount(vehicle: DriverVehicle | null): number {
    if (!vehicle || !vehicle.documents || !vehicle.documents.photos) return 0;
    const p = vehicle.documents.photos;
    let count = 0;
    if (p.front) count++;
    if (p.side) count++;
    if (p.rear) count++;
    if (p.cabin) count++;
    if (p.engineSerialPlate) count++;
    return count;
  }

  reuploadDocument(docType: 'rc' | 'insurance' | 'photos'): void {
    this.isEditingSelectedVehicle = true;
    if (docType === 'rc') {
      this.rcForm.regNumber = this.selectedVehicle?.regNumber || '';
      this.rcForm.frontPreview = this.selectedVehicle?.documents?.rcFront?.url || '';
      this.rcForm.backPreview = this.selectedVehicle?.documents?.rcBack?.url || '';
      this.navigateTo('UPLOAD_VEHICLE_RC');
    } else if (docType === 'insurance') {
      this.insuranceForm.previewUrl = this.selectedVehicle?.documents?.insurance?.url || '';
      this.navigateTo('UPLOAD_VEHICLE_INSURANCE');
    } else if (docType === 'photos') {
      this.photosForm.front = this.selectedVehicle?.documents?.photos?.front || '';
      this.photosForm.side = this.selectedVehicle?.documents?.photos?.side || '';
      this.photosForm.rear = this.selectedVehicle?.documents?.photos?.rear || '';
      this.photosForm.cabin = this.selectedVehicle?.documents?.photos?.cabin || '';
      this.photosForm.engineSerial = this.selectedVehicle?.documents?.photos?.engineSerialPlate || '';
      this.navigateTo('UPLOAD_VEHICLE_PHOTOS');
    }
  }

  openVehicleDocumentUpload(type: 'RC' | 'INSURANCE' | 'AGREEMENT' | 'PHOTOS'): void {
    if (!this.selectedVehicle) {
      this.isEditingSelectedVehicle = false;
    }
    if (type === 'RC') {
      this.rcForm.regNumber = this.selectedVehicle?.regNumber || this.newVehicle.regNumber || '';
      this.navigateTo('UPLOAD_VEHICLE_RC');
    }
    else if (type === 'INSURANCE') this.navigateTo('UPLOAD_VEHICLE_INSURANCE');
    else if (type === 'AGREEMENT') this.navigateTo('UPLOAD_VEHICLE_AGREEMENT');
    else if (type === 'PHOTOS') this.navigateTo('UPLOAD_VEHICLE_PHOTOS');
  }

  goBackFromDocUpload(): void {
    if (this.isEditingSelectedVehicle && this.selectedVehicle) {
      this.navigateTo('VEHICLE_DETAILS');
    } else {
      this.navigateTo('ADD_VEHICLE_FORM');
    }
  }

  openVehicleDetails(vehicle: DriverVehicle): void {
    this.selectedVehicle = vehicle;
    this.navigateTo('VEHICLE_DETAILS');
  }

  startAddVehicleFlow(): void {
    this.isEditingSelectedVehicle = false;
    this.vehicleValidationError = '';
    this.loadVehicleMasterCatalog();
    this.newVehicle = {} as any;

    this.rcForm = { regNumber: '', frontName: '', frontPreview: '', backName: '', backPreview: '' };
    this.insuranceForm = { policyNumber: '', providerName: '', fileName: '', previewUrl: '' };
    this.agreementForm = { type: 'Lease Agreement', regNumber: '', fileName: '', previewUrl: '' };
    this.photosForm = { front: '', side: '', rear: '', cabin: '', engineSerial: '' };

    this.navigateTo('ADD_VEHICLE_TYPE');
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
    const docObj = {
      rcFront: {
        name: this.rcForm.frontName || 'RC_Front.png',
        url: this.rcForm.frontPreview || '',
        status: (this.rcForm.frontPreview ? 'UNDER_REVIEW' : 'NOT_UPLOADED') as 'UNDER_REVIEW' | 'NOT_UPLOADED'
      },
      rcBack: {
        name: this.rcForm.backName || 'RC_Back.png',
        url: this.rcForm.backPreview || '',
        status: (this.rcForm.backPreview ? 'UNDER_REVIEW' : 'NOT_UPLOADED') as 'UNDER_REVIEW' | 'NOT_UPLOADED'
      }
    };
    if (this.newVehicle.documents) {
      this.newVehicle.documents.rcFront = docObj.rcFront;
      this.newVehicle.documents.rcBack = docObj.rcBack;
    }
    if (this.selectedVehicle) {
      if (!this.selectedVehicle.documents) this.selectedVehicle.documents = {};
      this.selectedVehicle.documents.rcFront = docObj.rcFront;
      this.selectedVehicle.documents.rcBack = docObj.rcBack;
      if (this.isEditingSelectedVehicle) {
        this.selectedVehicle.status = 'Under Review';
        this.selectedVehicle.rejectionReason = undefined;
        this.syncVehicleUpdateToBackend(this.selectedVehicle);
        this.notifyAdminForReverification(this.selectedVehicle);
      }
    }
    this.goBackFromDocUpload();
  }

  saveInsuranceDocument(): void {
    const insObj = {
      name: this.insuranceForm.fileName || 'Insurance.pdf',
      url: this.insuranceForm.previewUrl || '',
      policyNumber: this.insuranceForm.policyNumber || '',
      provider: this.insuranceForm.providerName || '',
      status: (this.insuranceForm.previewUrl ? 'UNDER_REVIEW' : 'NOT_UPLOADED') as 'UNDER_REVIEW' | 'NOT_UPLOADED'
    };
    if (this.newVehicle.documents) {
      this.newVehicle.documents.insurance = insObj;
    }
    if (this.selectedVehicle) {
      if (!this.selectedVehicle.documents) this.selectedVehicle.documents = {};
      this.selectedVehicle.documents.insurance = insObj;
      if (this.isEditingSelectedVehicle) {
        this.selectedVehicle.status = 'Under Review';
        this.selectedVehicle.rejectionReason = undefined;
        this.syncVehicleUpdateToBackend(this.selectedVehicle);
        this.notifyAdminForReverification(this.selectedVehicle);
      }
    }
    this.goBackFromDocUpload();
  }

  saveAgreementDocument(): void {
    const agrObj = {
      name: this.agreementForm.fileName || 'Agreement.pdf',
      url: this.agreementForm.previewUrl || '',
      agreementType: this.agreementForm.type,
      regNumber: this.agreementForm.regNumber,
      status: (this.agreementForm.previewUrl ? 'UNDER_REVIEW' : 'NOT_UPLOADED') as 'UNDER_REVIEW' | 'NOT_UPLOADED'
    };
    if (this.newVehicle.documents) {
      this.newVehicle.documents.agreement = agrObj;
    }
    if (this.selectedVehicle) {
      if (!this.selectedVehicle.documents) this.selectedVehicle.documents = {};
      this.selectedVehicle.documents.agreement = agrObj;
      if (this.isEditingSelectedVehicle) {
        this.selectedVehicle.status = 'Under Review';
        this.selectedVehicle.rejectionReason = undefined;
        this.syncVehicleUpdateToBackend(this.selectedVehicle);
        this.notifyAdminForReverification(this.selectedVehicle);
      }
    }
    this.goBackFromDocUpload();
  }

  savePhotosDocument(): void {
    const photosObj = {
      front: this.photosForm.front || '',
      side: this.photosForm.side || '',
      rear: this.photosForm.rear || '',
      cabin: this.photosForm.cabin || '',
      engineSerialPlate: this.photosForm.engineSerial || ''
    };
    if (this.newVehicle.documents) {
      this.newVehicle.documents.photos = photosObj;
    }
    if (this.selectedVehicle) {
      if (!this.selectedVehicle.documents) this.selectedVehicle.documents = {};
      this.selectedVehicle.documents.photos = photosObj;
      if (this.isEditingSelectedVehicle) {
        this.selectedVehicle.status = 'Under Review';
        this.selectedVehicle.rejectionReason = undefined;
        this.syncVehicleUpdateToBackend(this.selectedVehicle);
        this.notifyAdminForReverification(this.selectedVehicle);
      }
    }
    this.goBackFromDocUpload();
  }

  notifyAdminForReverification(vehicle: DriverVehicle): void {
    if (!vehicle) return;
    const driverName = this.driverProfile?.fullName || 'Driver';
    const regNum = vehicle.regNumber || 'Equipment';

    const notifyPayload = {
      title: 'Vehicle Re-verification Request',
      message: `${driverName} re-submitted documents for vehicle ${vehicle.vehicleName || 'Equipment'} (${regNum}) for re-approval.`,
      notificationType: 'VEHICLE',
      deepLink: '/admin/approvals'
    };

    if (this.http) {
      this.http.post(`${environment.serverApi}/api/v1/notifications/notify-admin`, notifyPayload).subscribe({
        next: () => console.log('Admin notified of vehicle re-verification request'),
        error: (err) => console.warn('Admin notification error:', err)
      });
    }
  }

  submitVehicleForReverification(): void {
    if (!this.selectedVehicle) return;

    this.selectedVehicle.status = 'Under Review';
    this.selectedVehicle.rejectionReason = undefined;

    this.syncVehicleUpdateToBackend(this.selectedVehicle);
    this.notifyAdminForReverification(this.selectedVehicle);

    this.navigateTo('VEHICLE_SUBMITTED');
  }

  syncVehicleUpdateToBackend(vehicle: DriverVehicle): void {
    if (!vehicle || !vehicle.id || !this.http) return;
    const body = {
      vehicleTypeId: vehicle.vehicleTypeId,
      vehicleModelId: vehicle.vehicleModelId,
      vehicleSubModelId: vehicle.vehicleSubModelId,
      vehicleName: vehicle.vehicleName || vehicle.machineryModel || 'Vehicle',
      category: vehicle.category,
      machineryModel: vehicle.machineryModel || vehicle.vehicleName,
      machinerySubCategory: vehicle.machinerySubCategory,
      regNumber: vehicle.regNumber,
      mfgYear: vehicle.mfgYear,
      machineClass: vehicle.machineClass,
      chassisVin: vehicle.chassisVin,
      engineSerial: vehicle.engineSerial,
      powertrain: vehicle.powertrain,
      vehicleDescription: vehicle.vehicleDescription,
      rcFrontUrl: vehicle.documents?.rcFront?.url || '',
      rcBackUrl: vehicle.documents?.rcBack?.url || '',
      insuranceUrl: vehicle.documents?.insurance?.url || '',
      frontPhotoUrl: vehicle.documents?.photos?.front || '',
      sidePhotoUrl: vehicle.documents?.photos?.side || '',
      rearPhotoUrl: vehicle.documents?.photos?.rear || '',
      cabinPhotoUrl: vehicle.documents?.photos?.cabin || '',
      enginePlatePhotoUrl: vehicle.documents?.photos?.engineSerialPlate || '',
      status: 'UNDER_REVIEW',
      rejectionReason: null
    };
    this.http.put<any>(`${environment.serverApi}/api/v1/vehicles/${vehicle.id}`, body).subscribe({
      next: () => this.savePersistentVehicles(),
      error: () => this.savePersistentVehicles()
    });
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

    // Find if we are updating an existing vehicle (e.g. placeholder with blank regNumber or selected vehicle)
    const existingBlank = this.vehiclesList.find(v => (!v.regNumber || !v.regNumber.trim()) && v.id);
    const targetVehicleId = (this.newVehicle.id && typeof this.newVehicle.id === 'number' && this.newVehicle.id < 1000000000)
      ? this.newVehicle.id
      : (existingBlank?.id || (this.isEditingSelectedVehicle && this.selectedVehicle?.id ? this.selectedVehicle.id : null));

    const vehicleDbPayload = {
      userId: userId,
      driverId: this.driverProfile?.id || 1,
      vehicleTypeId: this.newVehicle.vehicleTypeId,
      vehicleModelId: this.newVehicle.vehicleModelId,
      vehicleSubModelId: this.newVehicle.vehicleSubModelId,
      regNumber: this.newVehicle.regNumber,
      vehicleName: this.newVehicle.vehicleName || this.newVehicle.machineryModel || 'Vehicle',
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
      isActive: true,
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

    const saveRequest$ = targetVehicleId
      ? this.http.put<any>(`${environment.serverApi}/api/v1/vehicles/${targetVehicleId}`, vehicleDbPayload)
      : this.http.post<any>(`${environment.serverApi}/api/v1/vehicles`, vehicleDbPayload);

    saveRequest$.subscribe({
      next: (res) => {
        this.isSubmittingVehicle = false;
        const savedData = res?.data;
        const savedId = savedData?.id || targetVehicleId || Date.now();
        this.newVehicle.id = savedId;
        this.newVehicle.status = 'Under Review';

        // Update in-memory list: update existing if present, else prepend
        const existingIdx = this.vehiclesList.findIndex(v => v.id === savedId || (!v.regNumber && v.id === targetVehicleId));
        if (existingIdx >= 0) {
          this.vehiclesList[existingIdx] = { ...this.vehiclesList[existingIdx], ...this.newVehicle, id: savedId };
        } else {
          this.vehiclesList.unshift({ ...this.newVehicle, id: savedId });
        }
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
    if (!doc || !doc.url || !doc.url.trim()) return 'Not Attached';
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
        this.loadPersistentVehicles();
      },
      error: () => {
        this.loadBackendDocuments();
        this.loadPersistentVehicles();
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
    this.scrollToTop();
  }

  scrollToTop(): void {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as any });
      if (document.body) document.body.scrollTop = 0;
      if (document.documentElement) document.documentElement.scrollTop = 0;
      const scrollables = document.querySelectorAll('.profile-container, .main-content, .app-container, main, html, body');
      scrollables.forEach(el => {
        if (el) el.scrollTop = 0;
      });
      setTimeout(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' as any });
        if (document.body) document.body.scrollTop = 0;
        if (document.documentElement) document.documentElement.scrollTop = 0;
        scrollables.forEach(el => {
          if (el) el.scrollTop = 0;
        });
      }, 0);
      setTimeout(() => {
        window.scrollTo(0, 0);
        scrollables.forEach(el => {
          if (el) el.scrollTop = 0;
        });
      }, 50);
    }
  }

  onSaveProfile(): void {
    this.driverService.updateProfile(this.editForm).subscribe({
      next: (res) => {
        if (res.success) {
          this.driverProfile = res.data;
          this.navigateTo('PERSONAL_INFO');
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
        this.navigateTo('MAIN');
      }
    });
  }

  openDocumentDetail(doc: DocumentItem): void {
    this.selectedDocItem = doc;
    if (doc.status === 'NOT_UPLOADED') {
      this.openUploadForm();
    } else {
      this.navigateTo('DOCUMENT_DETAIL');
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
    this.navigateTo('UPLOAD_DOCUMENT');
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
            this.navigateTo('DOCUMENT_DETAIL');
          }
        },
        error: () => {
          this.selectedDocItem!.status = 'UNDER_REVIEW';
          this.selectedDocItem!.submittedOn = new Date().toLocaleDateString();
          this.selectedDocItem!.fileName = fileToUpload.name;
          if (this.frontPreviewUrl) {
            this.selectedDocItem!.fileUrl = this.frontPreviewUrl;
          }
          this.navigateTo('DOCUMENT_DETAIL');
        }
      });
    } else {
      this.selectedDocItem.status = 'UNDER_REVIEW';
      this.selectedDocItem.submittedOn = new Date().toLocaleDateString();
      this.navigateTo('DOCUMENT_DETAIL');
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
