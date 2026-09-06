import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  private http = inject(HttpClient);
  private readonly baseUrl = environment.serverApi;

  uploadDocument(file: File, documentType: string, entityType: string = 'DRIVER', entityId: number = 1): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('entityType', entityType);
    formData.append('entityId', entityId.toString());
    formData.append('documentType', documentType);

    return this.http.post<any>(`${this.baseUrl}/api/v1/documents/upload`, formData);
  }

  getDocumentsForEntity(entityType: string, entityId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/api/v1/documents/entity/${entityType}/${entityId}`);
  }

  downloadUrl(id: number): string {
    return `${this.baseUrl}/api/v1/documents/download/${id}`;
  }

  deleteDocument(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/api/v1/documents/${id}`);
  }
}
