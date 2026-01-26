/**
 * Create Client Use Case
 * Handles business logic for creating new clients
 */

import { Injectable } from '@angular/core';
import { Observable, map, catchError, of, switchMap, forkJoin } from 'rxjs';
import { ClientRepository } from '../../repositories/client.repository';
import { ClientEntity } from '../../entities/client.entity';
import {
  CreateClientRequest,
  UseCaseResult,
  ValidationResult,
  ClientCreatedEvent
} from '../../models/client.models';

@Injectable({
  providedIn: 'root'
})
export class CreateClientUseCase {
  constructor(private clientRepository: ClientRepository) {}

  execute(request: CreateClientRequest, userId: string): Observable<UseCaseResult<ClientEntity>> {
    return this.validateRequest(request).pipe(
      switchMap(validation => {
        if (!validation.isValid) {
          return of({
            success: false,
            validationErrors: validation.errors
          });
        }

        return this.checkUniqueness(request).pipe(
          switchMap(uniquenessValidation => {
            if (!uniquenessValidation.isValid) {
              return of({
                success: false,
                validationErrors: uniquenessValidation.errors
              });
            }

            return this.createClient(request).pipe(
              map(client => ({
                success: true,
                data: client,
                events: [this.createDomainEvent(client, userId)]
              })),
              catchError(error => of({
                success: false,
                error: this.getErrorMessage(error)
              }))
            );
          })
        );
      })
    );
  }

  private validateRequest(request: CreateClientRequest): Observable<ValidationResult> {
    const errors: Record<string, string[]> = {};

    // Name validation
    if (!request.name || request.name.trim().length === 0) {
      errors['name'] = ['Le nom/raison sociale est obligatoire'];
    } else if (request.name.trim().length < 2) {
      errors['name'] = ['Le nom/raison sociale doit contenir au moins 2 caractères'];
    } else if (request.name.trim().length > 255) {
      errors['name'] = ['Le nom/raison sociale ne peut pas dépasser 255 caractères'];
    }

    // Type validation
    if (!request.type) {
      errors['type'] = ['Le type de client est obligatoire'];
    } else if (!['particulier', 'entreprise'].includes(request.type)) {
      errors['type'] = ['Le type de client doit être "particulier" ou "entreprise"'];
    }

    // Email validation
    if (!request.email || request.email.trim().length === 0) {
      errors['email'] = ['L\'email est obligatoire'];
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(request.email)) {
        errors['email'] = ['L\'email n\'est pas valide'];
      }
    }

    // Phone validation (optional)
    if (request.phone && request.phone.trim().length > 0) {
      const phoneRegex = /^[\d\s\-\+\(\)\.]{8,20}$/;
      if (!phoneRegex.test(request.phone)) {
        errors['phone'] = ['Le numéro de téléphone n\'est pas valide'];
      }
    }

    // SIRET validation (optional)
    if (request.siret && request.siret.trim().length > 0) {
      if (request.siret.length !== 14 || !/^\d{14}$/.test(request.siret)) {
        errors['siret'] = ['Le SIRET doit contenir exactement 14 chiffres'];
      }
    }

    // Website validation (optional)
    if (request.website && request.website.trim().length > 0) {
      try {
        // Try with the URL as-is first
        new URL(request.website);
      } catch {
        try {
          // If it fails, try adding http:// prefix
          new URL('http://' + request.website);
        } catch {
          errors['website'] = ['L\'URL du site web n\'est pas valide'];
        }
      }
    }

    return of({
      isValid: Object.keys(errors).length === 0,
      errors
    });
  }

  private checkUniqueness(request: CreateClientRequest): Observable<ValidationResult> {
    const checks: Observable<any>[] = [
      this.clientRepository.isEmailUnique(request.email)
    ];

    if (request.siret && request.siret.trim().length > 0) {
      checks.push(this.clientRepository.isSiretUnique(request.siret));
    }

    return forkJoin(checks).pipe(
      map(results => {
        const errors: Record<string, string[]> = {};

        // Check email uniqueness
        if (!results[0]) {
          errors['email'] = ['Cet email est déjà utilisé par un autre client'];
        }

        // Check SIRET uniqueness if provided
        if (request.siret && results[1] !== undefined && !results[1]) {
          errors['siret'] = ['Ce SIRET est déjà utilisé par un autre client'];
        }

        return {
          isValid: Object.keys(errors).length === 0,
          errors
        };
      }),
      catchError(() => of({
        isValid: false,
        errors: { 'general': ['Erreur lors de la vérification d\'unicité'] }
      }))
    );
  }

  private createClient(request: CreateClientRequest): Observable<ClientEntity> {
    return this.clientRepository.create(request);
  }

  private createDomainEvent(client: ClientEntity, userId: string): ClientCreatedEvent {
    return {
      type: 'CLIENT_CREATED',
      clientId: client.id,
      clientUniqueId: client.clientId,
      userId,
      timestamp: new Date(),
      data: {
        name: client.name,
        type: client.type,
        email: client.email
      }
    };
  }

  private getErrorMessage(error: any): string {
    if (error?.message) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    return 'Une erreur inattendue s\'est produite lors de la création du client';
  }
}