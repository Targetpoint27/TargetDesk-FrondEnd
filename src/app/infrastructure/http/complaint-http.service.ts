import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from '../../core/api/api.service';
import { ComplaintRepository } from '../../domain/repositories/complaint.repository';
import { Complaint, StoreComplaintRequest, ProcessComplaintRequest, ComplaintListResponse } from '../../domain/models/complaint.model';

@Injectable({
  providedIn: 'root'
})
export class ComplaintHttpService extends ComplaintRepository {
  private readonly endpoint = '/call-center/complaints';

  constructor(private apiService: ApiService) {
    super();
  }

  override list(filters?: any): Observable<any> {
    return this.getAll(filters);
  }

  override getById(id: number): Observable<Complaint> {
    return this.apiService.get<any>(`${this.endpoint}/${id}`).pipe(
      map(response => this.apiService.unwrapApiResponse(response) as Complaint)
    );
  }

  // Renamed to match the Facade call and added explicit typing
  getAll(filters?: any): Observable<ComplaintListResponse> {
    return this.apiService.get<any>(this.endpoint, { params: filters }).pipe(
      map(response => this.apiService.unwrapApiResponse(response) as ComplaintListResponse)
    );
  }

  create(request: StoreComplaintRequest): Observable<Complaint> {
    return this.apiService.post<any>(this.endpoint, request).pipe(
      map(response => this.apiService.unwrapApiResponse(response))
    );
  }

  updateProcessing(id: number, request: ProcessComplaintRequest): Observable<Complaint> {
    return this.apiService.put<any>(`${this.endpoint}/${id}`, request).pipe(
      map(response => this.apiService.unwrapApiResponse(response))
    );
  }

  resolve(id: number, data: any): Observable<Complaint> {
    return this.apiService.post<any>(`${this.endpoint}/${id}/resolve`, data).pipe(
      map(response => this.apiService.unwrapApiResponse(response))
    );
  }

  close(id: number, data: any): Observable<Complaint> {
    return this.apiService.post<any>(`${this.endpoint}/${id}/close`, data).pipe(
      map(response => this.apiService.unwrapApiResponse(response))
    );
  }
}