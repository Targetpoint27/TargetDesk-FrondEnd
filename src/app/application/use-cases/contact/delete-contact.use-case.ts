import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ContactRepository } from '../../../domain/repositories/contact.repository';

@Injectable({
  providedIn: 'root'
})
export class DeleteContactUseCase {
  constructor(private contactRepository: ContactRepository) {}

  execute(contactId: number): Observable<boolean> {
    return this.contactRepository.deleteContact(contactId);
  }
}