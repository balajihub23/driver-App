import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class CameraService {
  private platformId = inject(PLATFORM_ID);
  private mediaStream: MediaStream | null = null;

  isCameraSupported(): boolean {
    return isPlatformBrowser(this.platformId) && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  async startCamera(videoElement: HTMLVideoElement): Promise<boolean> {
    if (!this.isCameraSupported()) return false;
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      videoElement.srcObject = this.mediaStream;
      await videoElement.play();
      return true;
    } catch (err) {
      console.warn('Could not access camera:', err);
      return false;
    }
  }

  capturePhoto(videoElement: HTMLVideoElement, fileName: string = 'captured_photo.jpg'): File | null {
    if (!videoElement || !videoElement.videoWidth) return null;

    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

    return this.dataURLtoFile(dataUrl, fileName);
  }

  stopCamera(videoElement?: HTMLVideoElement): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => {
        try {
          track.enabled = false;
          track.stop();
        } catch (e) {}
      });
      this.mediaStream = null;
    }
    if (videoElement) {
      if (videoElement.srcObject) {
        const stream = videoElement.srcObject as MediaStream;
        if (stream && stream.getTracks) {
          stream.getTracks().forEach(track => {
            try {
              track.enabled = false;
              track.stop();
            } catch (e) {}
          });
        }
        videoElement.srcObject = null;
      }
      try {
        videoElement.pause();
      } catch (e) {}
    }
  }

  private dataURLtoFile(dataurl: string, filename: string): File {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  }
}
