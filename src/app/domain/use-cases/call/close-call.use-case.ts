import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CallRepository } from '../../repositories/call.repository';
import { Call, CloseCallRequest } from '../../models/call.model';

@Injectable()
export class CloseCallUseCase {
  constructor(private callRepository: CallRepository) {}

  execute(id: number, data: CloseCallRequest): Observable<Call> {
    return this.callRepository.closeCall(id, data);
  }
}