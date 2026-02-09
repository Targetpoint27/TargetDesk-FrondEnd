import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CallRepository } from '../../repositories/call.repository';
import { Call } from '../../models/call.model';

@Injectable()
export class GetCallDetailsUseCase {
  constructor(private callRepository: CallRepository) {}

  execute(id: number): Observable<Call> {
    return this.callRepository.getCallDetails(id);
  }
}