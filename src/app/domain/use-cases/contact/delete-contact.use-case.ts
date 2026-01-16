/**
 * Delete Contact Use Case
 * Handles business logic for deleting contacts
 */

import { Injectable } from '@angular/core';
import { Observable, map, catchError, of } from 'rxjs';
import { ContactRepository } from '../../repositories/contact.repository';

export interface UseCaseResult {
  success: boolean;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DeleteContactUseCase {
  constructor(private contactRepository: ContactRepository) {}

  execute(contactId: number): Observable<UseCaseResult> {
    if (!contactId || contactId <= 0) {
      return of({
        success: false,
        error: 'L\'ID du contact est obligatoire'
      });
    }

    return this.contactRepository.delete(contactId).pipe(
      map(() => ({
        success: true
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

    return 'Une erreur inattendue s\'est produite lors de la suppression du contact';
  }
}