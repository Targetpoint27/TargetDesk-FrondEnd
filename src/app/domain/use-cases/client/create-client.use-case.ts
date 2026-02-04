/**
 * Create Client Use Case
 * Handles business logic for creating new clients
 */

import { Injectable } from '@angular/core';
import { Observable, map, catchError, of, switchMap } from 'rxjs';
import { ClientRepository } from '../../repositories/client.repository';
import { ClientEntity } from '../../entities/client.entity';
import {
  CreateClientRequest,
  UseCaseResult,
  ValidationResult,
  ClientCreatedEvent
} from '../../models/client.models';
import { AssignCategoriesUseCase } from '../client-category/assign-categories.use-case';

@Injectable({
  providedIn: 'root'
})
export class CreateClientUseCase {
  constructor(
    private clientRepository: ClientRepository,
    private assignCategoriesUseCase: AssignCategoriesUseCase
  ) {}

  execute(request: CreateClientRequest, userId: string): Observable<UseCaseResult<ClientEntity>> {
    return this.validateRequest(request).pipe(
      switchMap(validation => {
        if (!validation.isValid) {
          return of({
            success: false,
            validationErrors: validation.errors
          });
        }

        // Supprimer checkUniqueness - laisser l'API faire la validation
        return this.createClient(request).pipe(
          switchMap(client => {
            // If categories are provided, assign them to the client
            if (request.category_ids && request.category_ids.length > 0) {
              return this.assignCategoriesUseCase.execute(client.id, request.category_ids).pipe(
                map(categoryResponse => ({
                  success: true,
                  data: client.withUpdatedData({
                    categories: categoryResponse.categories,
                    categories_count: categoryResponse.categories.length,
                    categories_summary: this.generateCategorySummary(categoryResponse.categories)
                  }),
                  events: [this.createDomainEvent(client, userId)]
                })),
                catchError(categoryError => {
                  console.warn('Failed to assign categories to new client:', categoryError);
                  // Still return success for client creation, but without categories
                  return of({
                    success: true,
                    data: client,
                    events: [this.createDomainEvent(client, userId)],
                    warnings: ['Client créé mais erreur lors de l\'assignation des catégories']
                  });
                })
              );
            } else {
              return of({
                success: true,
                data: client,
                events: [this.createDomainEvent(client, userId)]
              });
            }
          }),
          catchError(error => {
            // Propager l'erreur HTTP directement sans la transformer
            throw error;
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

  private generateCategorySummary(categories: any[]): any[] {
    const summary = new Map();

    categories.forEach(category => {
      const type = category.type;
      if (summary.has(type)) {
        summary.get(type).count++;
        summary.get(type).categories.push({
          id: category.id,
          name: category.name,
          color: category.color
        });
      } else {
        summary.set(type, {
          type,
          count: 1,
          categories: [{
            id: category.id,
            name: category.name,
            color: category.color
          }]
        });
      }
    });

    return Array.from(summary.values());
  }

}