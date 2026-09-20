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
import { LogoutModalComponent } from '../../shared/components/logout-modal/logout-modal.component';

export type ProfileSubView = 
  | 'MAIN' 
  | 'PERSONAL_INFO' 
  | 'EDIT_PERSONAL_INFO' 
  | 'MY_DOCUMENTS' 
  | 'DOCUMENT_DETAIL' 
  | 'UPLOAD_DOCUMENT' 
  | 'LANGUAGE' 
  | 'MY_VEHICLES' 
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

  getSafeUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  currentView: ProfileSubView = 'MAIN';

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

  // Documents state
  documentsList: DocumentItem[] = [
    {
      docTypeKey: 'AADHAAR',
      title: 'Aadhaar Card',
      status: 'NOT_UPLOADED',
      docNumber: '',
      expiryDate: 'Oct 12, 2027',
      issuingAuthority: 'Government of India',
      submittedOn: '',
      fileName: '',
      fileUrl: ''
    },
    {
      docTypeKey: 'LICENSE',
      title: 'Driving License',
      status: 'NOT_UPLOADED',
      docNumber: '',
      expiryDate: 'Dec 15, 2028',
      issuingAuthority: 'State RTO',
      submittedOn: '',
      fileName: '',
      fileUrl: ''
    },
    {
      docTypeKey: 'PAN',
      title: 'PAN Card',
      status: 'NOT_UPLOADED',
      docNumber: '',
      expiryDate: 'N/A',
      issuingAuthority: 'Income Tax Dept',
      submittedOn: '',
      fileName: '',
      fileUrl: ''
    },
    {
      docTypeKey: 'RC',
      title: 'Vehicle RC',
      status: 'NOT_UPLOADED',
      docNumber: '',
      expiryDate: 'Aug 20, 2030',
      issuingAuthority: 'Transport Dept',
      submittedOn: '',
      fileName: '',
      fileUrl: ''
    },
    {
      docTypeKey: 'PHOTO',
      title: 'Photo',
      status: 'NOT_UPLOADED',
      docNumber: '',
      expiryDate: 'N/A',
      issuingAuthority: 'Self Upload',
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

  ngOnInit(): void {
    this.loadProfile();
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
