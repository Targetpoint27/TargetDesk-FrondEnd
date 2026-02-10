import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CallRepository } from '../../repositories/call.repository';
import { CallNote } from '../../models/call.model';

export interface AddCallNoteRequest {
  note: string;
  is_important?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AddCallNoteUseCase {
  constructor(private callRepository: CallRepository) {}

  execute(callId: number, request: AddCallNoteRequest): Observable<CallNote> {
    return this.callRepository.addNote(callId, request);
  }
}