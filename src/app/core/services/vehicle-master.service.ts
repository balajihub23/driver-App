import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface VehicleType {
  id: number;
  name: string;
  code: string;
  description?: string;
  iconUrl?: string;
  displayOrder?: number;
  active?: boolean;
  models?: VehicleModel[];
}

export interface VehicleModel {
  id: number;
  vehicleTypeId: number;
  name: string;
  code?: string;
  description?: string;
  iconUrl?: string;
  displayOrder?: number;
  active?: boolean;
  subModels?: VehicleSubModel[];
}

export interface VehicleSubModel {
  id: number;
  vehicleModelId: number;
  name: string;
  code?: string;
  description?: string;
  manufacturer?: string;
  machineClass?: string;
  horsePower?: string;
  capacity?: string;
  fuelType?: string;
  iconUrl?: string;
  displayOrder?: number;
  active?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class VehicleMasterService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.serverApi}/api/v1/vehicle-masters`;

  getActiveVehicleTypes(): Observable<ApiResponse<VehicleType[]>> {
    return this.http.get<ApiResponse<VehicleType[]>>(`${this.baseUrl}/types`).pipe(
      catchError(err => {
        console.warn('Backend GET active vehicle types failed:', err);
        return of({ success: false, message: 'Failed to load vehicle types', data: [] });
      })
    );
  }

  getModelsByType(typeId: number): Observable<ApiResponse<VehicleModel[]>> {
    return this.http.get<ApiResponse<VehicleModel[]>>(`${this.baseUrl}/types/${typeId}/models`).pipe(
      catchError(err => {
        console.warn(`Backend GET models for type ${typeId} failed:`, err);
        return of({ success: false, message: 'Failed to load models', data: [] });
      })
    );
  }

  getSubModelsByModel(modelId: number): Observable<ApiResponse<VehicleSubModel[]>> {
    return this.http.get<ApiResponse<VehicleSubModel[]>>(`${this.baseUrl}/models/${modelId}/sub-models`).pipe(
      catchError(err => {
        console.warn(`Backend GET sub-models for model ${modelId} failed:`, err);
        return of({ success: false, message: 'Failed to load sub-models', data: [] });
      })
    );
  }

  getCatalog(): Observable<ApiResponse<VehicleType[]>> {
    return this.http.get<ApiResponse<VehicleType[]>>(`${this.baseUrl}/catalog`).pipe(
      catchError(err => {
        console.warn('Backend GET vehicle catalog failed:', err);
        return of({ success: false, message: 'Failed to load vehicle catalog', data: [] });
      })
    );
  }
}
