import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { CallRepository } from '../../repositories/call.repository';

export interface FilterCallsRequest {
  type?: string;
  status?: string;
  department_id?: number;
  urgency?: string;
  assigned_to?: string;
  period?: string;
  date_from?: string;
  date_to?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FilterCallsUseCase {
  constructor(private callRepository: CallRepository) {}

  execute(filters: FilterCallsRequest): Observable<any> {
    return this.callRepository.filter(filters).pipe(
      map((response: any) => {
        // Backend returns: { success, message, data: { total, filters_applied, calls } }
        return response.data || { total: 0, filters_applied: {}, calls: [] };
      })
    );
  }
}