/**
 * Get Contacts Use Case
 * Handles business logic for retrieving contacts with pagination and filtering
 */

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ContactRepository, ContactsListResponse } from '../../repositories/contact.repository';
import { ContactEntity, ContactFilters } from '../../entities/contact.entity';

export interface PaginationParams {
  page?: number;
  perPage?: number;
}

export type { ContactFilters };

@Injectable({
  providedIn: 'root'
})
export class GetContactsUseCase {
  constructor(private contactRepository: ContactRepository) {}

  execute(filters?: ContactFilters, pagination?: PaginationParams) {
    // Convertir les paramètres modernes vers l'interface legacy
    const legacyFilters = {
      ...filters,
      page: pagination?.page || 1,
      per_page: pagination?.perPage || 15
    };
    return this.contactRepository.getContacts(legacyFilters);
  }
}