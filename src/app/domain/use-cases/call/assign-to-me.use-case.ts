import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CallRepository } from '../../repositories/call.repository';
import { Call } from '../../models/call.model';

@Injectable({
  providedIn: 'root'
})
export class AssignToMeUseCase {
  constructor(private callRepository: CallRepository) {}

  execute(callId: number): Observable<Call> {
    return this.callRepository.assignToMe(callId);
  }
}