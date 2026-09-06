import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CameraService } from '../../../core/services/camera.service';

@Component({
  selector: 'app-image-upload-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './image-upload-modal.component.html',
  styleUrl: './image-upload-modal.component.scss'
})
export class ImageUploadModalComponent implements OnDestroy {
  @Input() isOpen: boolean = false;
  @Input() title: string = 'Upload Document';
  @Input() accept: string = 'image/*,application/pdf';
  @Output() fileCaptured = new EventEmitter<File>();
  @Output() modalClosed = new EventEmitter<void>();

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;

  cameraService = inject(CameraService);

  activeMode: 'SELECT' | 'CAMERA' | 'PREVIEW' = 'SELECT';
  selectedFile: File | null = null;

  triggerFileInput(): void {
    if (this.fileInput) {
      this.fileInput.nativeElement.click();
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
      this.activeMode = 'PREVIEW';
    }
  }

  async openCamera(): Promise<void> {
    this.activeMode = 'CAMERA';
    setTimeout(async () => {
      if (this.videoElement) {
        await this.cameraService.startCamera(this.videoElement.nativeElement);
      }
    }, 100);
  }

  takePhoto(): void {
    if (this.videoElement) {
      const file = this.cameraService.capturePhoto(this.videoElement.nativeElement, 'document_camera_snap.jpg');
      if (file) {
        this.selectedFile = file;
        this.cameraService.stopCamera(this.videoElement.nativeElement);
        this.activeMode = 'PREVIEW';
      }
    }
  }

  confirmUpload(): void {
    if (this.selectedFile) {
      this.fileCaptured.emit(this.selectedFile);
      this.close();
    }
  }

  close(): void {
    if (this.activeMode === 'CAMERA' && this.videoElement) {
      this.cameraService.stopCamera(this.videoElement.nativeElement);
    }
    this.activeMode = 'SELECT';
    this.selectedFile = null;
    this.modalClosed.emit();
  }

  ngOnDestroy(): void {
    this.cameraService.stopCamera();
  }
}
