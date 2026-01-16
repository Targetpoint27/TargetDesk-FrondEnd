/**
 * Create Supplier Contact Use Case
 * Handles business logic for creating new contacts for suppliers
 */

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ContactRepository } from '../../repositories/contact.repository';
import { ContactEntity } from '../../entities/contact.entity';
import { CreateContactUseCase, CreateContactRequest, UseCaseResult } from './create-contact.use-case';

@Injectable({
  providedIn: 'root'
})
export class CreateSupplierContactUseCase {
  constructor(
    private contactRepository: ContactRepository,
    private createContactUseCase: CreateContactUseCase
  ) {}

  execute(supplierId: number, contactData: Omit<CreateContactRequest, 'clientId' | 'supplierId'>): Observable<UseCaseResult<ContactEntity>> {
    const request: CreateContactRequest = {
      ...contactData,
      supplierId: supplierId
    };

    return this.createContactUseCase.execute(request);
  }
}