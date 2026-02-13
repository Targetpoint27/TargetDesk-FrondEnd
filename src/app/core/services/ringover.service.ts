import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService, ApiResponse } from '../api/api.service';
import { RingoverCall } from '../interfaces/ringover.interface';
@Injectable({
  providedIn: 'root'
})
export class RingoverService {
  constructor(private apiService: ApiService) {}

  /**
   * Fetches call history using the existing ApiService architecture
   */
  getCallHistory(limit: number = 20): Observable<RingoverCall[]> {
    return this.apiService.get<ApiResponse<RingoverCall[]>>(
      '/ringover/calls', 
      { params: { limit_count: limit.toString() } }
    ).pipe(
      map(response => response.data)
    );
  }
}