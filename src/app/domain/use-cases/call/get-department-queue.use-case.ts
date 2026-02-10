import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CallRepository } from '../../repositories/call.repository';
import { Call } from '../../models/call.model';

@Injectable({
  providedIn: 'root'
})
export class GetDepartmentQueueUseCase {
  constructor(private callRepository: CallRepository) {}

  execute(): Observable<Call[]> {
    return this.callRepository.getDepartmentQueue();
  }
}