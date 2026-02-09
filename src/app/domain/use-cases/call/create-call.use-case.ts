import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CallRepository } from '../../repositories/call.repository';
import { Call, CreateCallRequest } from '../../models/call.model';

@Injectable()
export class CreateCallUseCase {
  constructor(private callRepository: CallRepository) {}

  execute(data: CreateCallRequest): Observable<Call> {
    return this.callRepository.createCall(data);
  }
}