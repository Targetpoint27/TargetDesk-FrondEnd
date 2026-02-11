import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CallRepository } from '../../repositories/call.repository';
import { Call, CallbackResultRequest } from '../../models/call.model';

@Injectable({
  providedIn: 'root'
})
export class RecordCallbackResultUseCase {
  constructor(private callRepository: CallRepository) {}

  execute(callId: number, request: CallbackResultRequest): Observable<Call> {
    return this.callRepository.recordCallbackResult(callId, request);
  }
}