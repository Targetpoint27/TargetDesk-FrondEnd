import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { CallRepository } from '../../repositories/call.repository';
import { Call } from '../../models/call.model';

@Injectable({
  providedIn: 'root'
})
export class SearchCallsUseCase {
  constructor(private callRepository: CallRepository) {}

  execute(query: string): Observable<Call[]> {
    return this.callRepository.search(query).pipe(
      map((response: any) => {
        // Backend returns: { success, message, data: [...] }
        const calls = response.data || [];
        return Array.isArray(calls) ? calls : [];
      })
    );
  }
}