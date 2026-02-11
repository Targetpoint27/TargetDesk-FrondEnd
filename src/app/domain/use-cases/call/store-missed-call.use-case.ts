import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CallRepository } from '../../repositories/call.repository';
import { Call, StoreMissedCallRequest } from '../../models/call.model';

@Injectable({
  providedIn: 'root'
})
export class StoreMissedCallUseCase {
  constructor(private callRepository: CallRepository) {}

  execute(request: StoreMissedCallRequest): Observable<Call> {
    return this.callRepository.storeMissedCall(request);
  }
}