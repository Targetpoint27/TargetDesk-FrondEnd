/**
 * Update Contact Use Case
 * Handles business logic for updating existing contacts
 */

import { Injectable } from '@angular/core';
import { Observable, map, catchError, of, switchMap } from 'rxjs';
import { ContactRepository } from '../../repositories/contact.repository';
import { ContactEntity } from '../../entities/contact.entity';

export interface UpdateContactRequest {
  contactId: number;
  civility?: string;
  firstName?: string;
  lastName?: string;
  functionValue?: string;
  department?: string;
  emails?: Array<{
    email: string;
    type: string;
    isPrimary: boolean;
  }>;
  phones?: Array<{
    phone: string;
    type: string;
    isPrimary: boolean;
  }>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
}

export interface UseCaseResult<T> {
  success: boolean;
  data?: T;
  validationErrors?: Record<string, string[]>;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UpdateContactUseCase {
  constructor(private contactRepository: ContactRepository) {}

  execute(request: UpdateContactRequest): Observable<UseCaseResult<ContactEntity>> {
    return this.validateRequest(request).pipe(
      switchMap(validation => {
        if (!validation.isValid) {
          return of({
            success: false,
            validationErrors: validation.errors
          });
        }

        return this.updateContact(request).pipe(
          map(contact => ({
            success: true,
            data: contact
          })),
          catchError(error => of({
            success: false,
            error: this.getErrorMessage(error)
          }))
        );
      })
    );
  }

  private validateRequest(request: UpdateContactRequest): Observable<ValidationResult> {
    const errors: Record<string, string[]> = {};

    // Contact ID validation
    if (!request.contactId || request.contactId <= 0) {
      errors['contactId'] = ['L\'ID du contact est obligatoire'];
    }

    // First name validation (if provided)
    if (request.firstName !== undefined) {
      if (!request.firstName || request.firstName.trim().length === 0) {
        errors['firstName'] = ['Le prénom ne peut pas être vide'];
      } else if (request.firstName.trim().length < 2) {
        errors['firstName'] = ['Le prénom doit contenir au moins 2 caractères'];
      } else if (request.firstName.trim().length > 255) {
        errors['firstName'] = ['Le prénom ne peut pas dépasser 255 caractères'];
      }
    }

    // Last name validation (if provided)
    if (request.lastName !== undefined) {
      if (!request.lastName || request.lastName.trim().length === 0) {
        errors['lastName'] = ['Le nom ne peut pas être vide'];
      } else if (request.lastName.trim().length < 2) {
        errors['lastName'] = ['Le nom doit contenir au moins 2 caractères'];
      } else if (request.lastName.trim().length > 255) {
        errors['lastName'] = ['Le nom ne peut pas dépasser 255 caractères'];
      }
    }

    // Emails validation (if provided)
    if (request.emails !== undefined) {
      if (request.emails.length === 0) {
        errors['emails'] = ['Au moins un email est obligatoire'];
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const primaryEmails = request.emails.filter(e => e.isPrimary);

        if (primaryEmails.length !== 1) {
          errors['emails'] = ['Exactement un email doit être marqué comme principal'];
        }

        request.emails.forEach((email, index) => {
          if (!email.email || !emailRegex.test(email.email)) {
            errors[`emails.${index}.email`] = ['Email invalide'];
          }
          if (!email.type || !['professionnel', 'personnel', 'autre'].includes(email.type)) {
            errors[`emails.${index}.type`] = ['Type d\'email invalide'];
          }
        });
      }
    }

    // Phones validation (if provided)
    if (request.phones !== undefined && request.phones.length > 0) {
      const primaryPhones = request.phones.filter(p => p.isPrimary);

      if (primaryPhones.length > 1) {
        errors['phones'] = ['Un seul téléphone peut être marqué comme principal'];
      }

      request.phones.forEach((phone, index) => {
        if (!phone.phone || phone.phone.trim().length === 0) {
          errors[`phones.${index}.phone`] = ['Le numéro de téléphone ne peut pas être vide'];
        }
        if (!phone.type || !['bureau', 'mobile', 'domicile', 'fax', 'autre'].includes(phone.type)) {
          errors[`phones.${index}.type`] = ['Type de téléphone invalide'];
        }
      });
    }

    return of({
      isValid: Object.keys(errors).length === 0,
      errors
    });
  }

  private updateContact(request: UpdateContactRequest): Observable<ContactEntity> {
    return this.contactRepository.update(request.contactId, request);
  }

  private getErrorMessage(error: any): string {
    if (error?.message) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    return 'Une erreur inattendue s\'est produite lors de la mise à jour du contact';
  }
}