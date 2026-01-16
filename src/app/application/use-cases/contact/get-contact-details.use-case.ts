import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ContactRepository } from '../../../domain/repositories/contact.repository';
import { ContactEntity } from '../../../domain/entities/contact.entity';

@Injectable({
  providedIn: 'root'
})
export class GetContactDetailsUseCase {
  constructor(private contactRepository: ContactRepository) {}

  execute(contactId: number): Observable<ContactEntity> {
    return this.contactRepository.getContactDetails(contactId);
  }
}