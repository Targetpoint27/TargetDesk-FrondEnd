import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CallRepository } from '../../repositories/call.repository';
import { Call, ScheduleCallbackRequest } from '../../models/call.model';

@Injectable({
  providedIn: 'root'
})
export class ScheduleCallbackUseCase {
  constructor(private callRepository: CallRepository) {}

  execute(callId: number, request: ScheduleCallbackRequest): Observable<Call> {
    return this.callRepository.scheduleCallback(callId, request);
  }
}