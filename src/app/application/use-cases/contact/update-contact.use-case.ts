import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ContactRepository } from '../../../domain/repositories/contact.repository';
import { ContactEntity, UpdateContactData } from '../../../domain/entities/contact.entity';

@Injectable({
  providedIn: 'root'
})
export class UpdateContactUseCase {
  constructor(private contactRepository: ContactRepository) {}

  execute(contactId: number, updateData: UpdateContactData): Observable<ContactEntity> {
    return this.contactRepository.updateContact(contactId, updateData);
  }
}