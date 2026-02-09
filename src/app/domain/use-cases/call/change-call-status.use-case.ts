import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CallRepository } from '../../repositories/call.repository';
import { Call, ChangeStatusRequest } from '../../models/call.model';

@Injectable()
export class ChangeCallStatusUseCase {
  constructor(private callRepository: CallRepository) {}

  execute(id: number, data: ChangeStatusRequest): Observable<Call> {
    return this.callRepository.changeStatus(id, data);
  }
}