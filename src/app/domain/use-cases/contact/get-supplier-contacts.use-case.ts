/**
 * Get Supplier Contacts Use Case
 * Handles business logic for retrieving contacts for a specific supplier
 */

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ContactRepository, SupplierContactsResponse } from '../../repositories/contact.repository';
import { ContactEntity } from '../../entities/contact.entity';

export interface PaginationParams {
  page?: number;
  perPage?: number;
}

@Injectable({
  providedIn: 'root'
})
export class GetSupplierContactsUseCase {
  constructor(private contactRepository: ContactRepository) {}

  execute(supplierId: number, pagination?: PaginationParams): Observable<SupplierContactsResponse> {
    return this.contactRepository.getSupplierContacts(supplierId, pagination?.page || 1, pagination?.perPage || 15);
  }
}