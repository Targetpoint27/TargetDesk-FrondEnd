import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ContactRepository, ContactsListResponse } from '../../../domain/repositories/contact.repository';
import { ContactFilters } from '../../../domain/entities/contact.entity';

@Injectable({
  providedIn: 'root'
})
export class GetContactsUseCase {
  constructor(private contactRepository: ContactRepository) {}

  execute(filters?: ContactFilters): Observable<ContactsListResponse> {
    return this.contactRepository.getContacts(filters);
  }
}