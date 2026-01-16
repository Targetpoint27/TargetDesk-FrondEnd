/**
 * Get Client Contacts Use Case
 * Handles business logic for retrieving contacts for a specific client
 */

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ContactRepository, ClientContactsResponse } from '../../repositories/contact.repository';
import { ContactEntity } from '../../entities/contact.entity';

export interface PaginationParams {
  page?: number;
  perPage?: number;
}

@Injectable({
  providedIn: 'root'
})
export class GetClientContactsUseCase {
  constructor(private contactRepository: ContactRepository) {}

  execute(clientId: number, pagination?: PaginationParams): Observable<ClientContactsResponse> {
    return this.contactRepository.getClientContacts(clientId, pagination?.page || 1, pagination?.perPage || 15);
  }
}