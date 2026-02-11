import { Observable } from 'rxjs';
import { Complaint, StoreComplaintRequest, ProcessComplaintRequest } from '../models/complaint.model';

export abstract class ComplaintRepository {
  abstract list(filters?: any): Observable<{
    total: number;
    overdue_count: number;
    complaints: Complaint[];
  }>;
  
  abstract create(request: StoreComplaintRequest): Observable<Complaint>;
  
  abstract updateProcessing(id: number, request: ProcessComplaintRequest): Observable<Complaint>;
  
  abstract resolve(id: number, data: any): Observable<Complaint>;
  
  abstract close(id: number, data: any): Observable<Complaint>;
}