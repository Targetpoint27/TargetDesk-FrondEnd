import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ContactRepository, ClientContactsResponse } from '../../../domain/repositories/contact.repository';

@Injectable({
  providedIn: 'root'
})
export class GetClientContactsUseCase {
  constructor(private contactRepository: ContactRepository) {}

  execute(clientId: number, page: number = 1, perPage: number = 10): Observable<ClientContactsResponse> {
    return this.contactRepository.getClientContacts(clientId, page, perPage);
  }
}