/**
 * Update Client Use Case
 * Handles business logic for updating existing clients
 */

import { Injectable } from '@angular/core';
import { Observable, map, catchError, of, switchMap } from 'rxjs';
import { ClientRepository } from '../../repositories/client.repository';
import { ClientEntity } from '../../entities/client.entity';
import {
  UpdateClientRequest,
  UseCaseResult,
  ValidationResult,
  ClientUpdatedEvent
} from '../../models/client.models';

@Injectable({
  providedIn: 'root'
})
export class UpdateClientUseCase {
  constructor(private clientRepository: ClientRepository) {}

  execute(
    clientId: number,
    request: UpdateClientRequest,
    userId: string
  ): Observable<UseCaseResult<ClientEntity>> {
    return this.getExistingClient(clientId).pipe(
      switchMap(existingClient => {
        if (!existingClient) {
          return of({
            success: false,
            error: 'Client non trouvé'
          });
        }

        return this.validateRequest(request, clientId).pipe(
          switchMap(validation => {
            if (!validation.isValid) {
              return of({
                success: false,
                validationErrors: validation.errors
              });
            }

            // Supprimer checkUniqueness - laisser l'API faire la validation
            return this.updateClient(clientId, request).pipe(
              map(updatedClient => ({
                success: true,
                data: updatedClient,
                events: [this.createDomainEvent(updatedClient, existingClient, userId)]
              })),
              catchError(error => {
                // Propager l'erreur HTTP directement sans la transformer
                throw error;
              })
            );
          })
        );
      })
    );
  }

  private getExistingClient(clientId: number): Observable<ClientEntity | null> {
    return this.clientRepository.getById(clientId);
  }

  private validateRequest(request: UpdateClientRequest, clientId: number): Observable<ValidationResult> {
    const errors: Record<string, string[]> = {};

    // Name validation (if provided)
    if (request.name !== undefined) {
      if (!request.name || request.name.trim().length === 0) {
        errors['name'] = ['Le nom/raison sociale est obligatoire'];
      } else if (request.name.trim().length < 2) {
        errors['name'] = ['Le nom/raison sociale doit contenir au moins 2 caractères'];
      } else if (request.name.trim().length > 255) {
        errors['name'] = ['Le nom/raison sociale ne peut pas dépasser 255 caractères'];
      }
    }

    // Type validation (if provided)
    if (request.type !== undefined) {
      if (!['particulier', 'entreprise'].includes(request.type)) {
        errors['type'] = ['Le type de client doit être "particulier" ou "entreprise"'];
      }
    }

    // Email validation (if provided)
    if (request.email !== undefined && request.email && request.email.trim().length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(request.email)) {
        errors['email'] = ['L\'email n\'est pas valide'];
      }
    }

    // Phone validation (if provided)
    if (request.phone !== undefined && request.phone && request.phone.trim().length > 0) {
      const phoneRegex = /^[\d\s\-\+\(\)\.]{8,20}$/;
      if (!phoneRegex.test(request.phone)) {
        errors['phone'] = ['Le numéro de téléphone n\'est pas valide'];
      }
    }

    // SIRET validation (if provided)
    if (request.siret !== undefined && request.siret && request.siret.trim().length > 0) {
      if (request.siret.length !== 14 || !/^\d{14}$/.test(request.siret)) {
        errors['siret'] = ['Le SIRET doit contenir exactement 14 chiffres'];
      }
    }

    // Website validation (if provided)
    if (request.website !== undefined && request.website && request.website.trim().length > 0) {
      try {
        new URL(request.website);
      } catch {
        errors['website'] = ['L\'URL du site web n\'est pas valide'];
      }
    }

    return of({
      isValid: Object.keys(errors).length === 0,
      errors
    });
  }


  private updateClient(clientId: number, request: UpdateClientRequest): Observable<ClientEntity> {
    return this.clientRepository.update(clientId, request);
  }

  private createDomainEvent(
    updatedClient: ClientEntity,
    previousClient: ClientEntity,
    userId: string
  ): ClientUpdatedEvent {
    const changes: Partial<UpdateClientRequest> = {};
    const previousValues: Partial<UpdateClientRequest> = {};

    // Compare fields to detect changes
    if (updatedClient.name !== previousClient.name) {
      changes.name = updatedClient.name;
      previousValues.name = previousClient.name;
    }

    if (updatedClient.email !== previousClient.email) {
      changes.email = updatedClient.email;
      previousValues.email = previousClient.email;
    }

    if (updatedClient.phone !== previousClient.phone) {
      changes.phone = updatedClient.phone || undefined;
      previousValues.phone = previousClient.phone || undefined;
    }

    if (updatedClient.type !== previousClient.type) {
      changes.type = updatedClient.type;
      previousValues.type = previousClient.type;
    }

    if (updatedClient.address !== previousClient.address) {
      changes.address = updatedClient.address || undefined;
      previousValues.address = previousClient.address || undefined;
    }

    if (updatedClient.siret !== previousClient.siret) {
      changes.siret = updatedClient.siret || undefined;
      previousValues.siret = previousClient.siret || undefined;
    }

    if (updatedClient.sector !== previousClient.sector) {
      changes.sector = updatedClient.sector || undefined;
      previousValues.sector = previousClient.sector || undefined;
    }

    if (updatedClient.website !== previousClient.website) {
      changes.website = updatedClient.website || undefined;
      previousValues.website = previousClient.website || undefined;
    }

    if (updatedClient.notes !== previousClient.notes) {
      changes.notes = updatedClient.notes || undefined;
      previousValues.notes = previousClient.notes || undefined;
    }

    return {
      type: 'CLIENT_UPDATED',
      clientId: updatedClient.id,
      clientUniqueId: updatedClient.clientId,
      userId,
      timestamp: new Date(),
      data: {
        changes,
        previousValues
      }
    };
  }

}