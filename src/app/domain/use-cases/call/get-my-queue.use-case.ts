import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CallRepository } from '../../repositories/call.repository';
import { Call } from '../../models/call.model';

@Injectable()
export class GetMyQueueUseCase {
  constructor(private callRepository: CallRepository) {}

  execute(): Observable<Call[]> {
    return this.callRepository.getMyQueue();
  }
}