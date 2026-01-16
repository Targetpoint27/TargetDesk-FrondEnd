import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ContactRepository } from '../../../domain/repositories/contact.repository';
import { ContactEntity, CreateContactData } from '../../../domain/entities/contact.entity';

export interface CreateContactParams {
  entityId: number;
  entityType: 'client' | 'supplier';
  contactData: CreateContactData;
}

@Injectable({
  providedIn: 'root'
})
export class CreateContactUseCase {
  constructor(private contactRepository: ContactRepository) {}

  execute(params: CreateContactParams): Observable<ContactEntity> {
    const { entityId, entityType, contactData } = params;

    if (entityType === 'client') {
      return this.contactRepository.createClientContact(entityId, contactData);
    } else {
      return this.contactRepository.createSupplierContact(entityId, contactData);
    }
  }

  executeForClient(clientId: number, contactData: CreateContactData): Observable<ContactEntity> {
    return this.contactRepository.createClientContact(clientId, contactData);
  }

  executeForSupplier(supplierId: number, contactData: CreateContactData): Observable<ContactEntity> {
    return this.contactRepository.createSupplierContact(supplierId, contactData);
  }
}