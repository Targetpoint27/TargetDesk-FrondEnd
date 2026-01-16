/**
 * Make Primary Contact Use Case
 * Handles business logic for setting a contact as primary for an entity
 */

import { Injectable } from '@angular/core';
import { Observable, map, catchError, of } from 'rxjs';
import { ContactRepository } from '../../repositories/contact.repository';
import { ContactEntity } from '../../entities/contact.entity';

export interface UseCaseResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MakePrimaryContactUseCase {
  constructor(private contactRepository: ContactRepository) {}

  execute(contactId: number): Observable<UseCaseResult<ContactEntity>> {
    if (!contactId || contactId <= 0) {
      return of({
        success: false,
        error: 'L\'ID du contact est obligatoire'
      });
    }

    return this.contactRepository.makePrimary(contactId).pipe(
      map(contact => ({
        success: true,
        data: contact
      })),
      catchError(error => of({
        success: false,
        error: this.getErrorMessage(error)
      }))
    );
  }

  private getErrorMessage(error: any): string {
    if (error?.message) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    return 'Une erreur inattendue s\'est produite lors de la définition du contact principal';
  }
}