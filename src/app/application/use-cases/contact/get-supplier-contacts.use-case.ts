import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ContactRepository, SupplierContactsResponse } from '../../../domain/repositories/contact.repository';

@Injectable({
  providedIn: 'root'
})
export class GetSupplierContactsUseCase {
  constructor(private contactRepository: ContactRepository) {}

  execute(supplierId: number, page: number = 1, perPage: number = 10): Observable<SupplierContactsResponse> {
    return this.contactRepository.getSupplierContacts(supplierId, page, perPage);
  }
}