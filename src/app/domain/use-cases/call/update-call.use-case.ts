import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CallRepository } from '../../repositories/call.repository';
import { Call, UpdateCallRequest } from '../../models/call.model';

@Injectable()
export class UpdateCallUseCase {
  constructor(private callRepository: CallRepository) {}

  execute(id: number, data: UpdateCallRequest): Observable<Call> {
    return this.callRepository.updateCall(id, data);
  }
}