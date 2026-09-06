import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-end-job-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './end-job-modal.component.html',
  styleUrl: './end-job-modal.component.scss'
})
export class EndJobModalComponent {
  @Input() isOpen: boolean = false;
  @Input() jobData: any = null;

  @Output() close = new EventEmitter<void>();
  @Output() jobEnded = new EventEmitter<{ proofPhoto: File | null; description: string }>();

  selectedFile: File | null = null;
  photoPreviewUrl: string = '';
  completionDescription: string = '';
  isSubmitting: boolean = false;

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.photoPreviewUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removePhoto(): void {
    this.selectedFile = null;
    this.photoPreviewUrl = '';
  }

  onSubmitCompletion(): void {
    if (!this.selectedFile && !this.photoPreviewUrl) {
      alert('Please attach a site completion photo to confirm job end.');
      return;
    }
    if (!this.completionDescription.trim()) {
      alert('Please enter a brief completion description note.');
      return;
    }

    this.isSubmitting = true;
    setTimeout(() => {
      this.isSubmitting = false;
      this.jobEnded.emit({
        proofPhoto: this.selectedFile,
        description: this.completionDescription
      });
      this.resetModal();
    }, 600);
  }

  onClose(): void {
    this.close.emit();
    this.resetModal();
  }

  private resetModal(): void {
    this.selectedFile = null;
    this.photoPreviewUrl = '';
    this.completionDescription = '';
  }
}
