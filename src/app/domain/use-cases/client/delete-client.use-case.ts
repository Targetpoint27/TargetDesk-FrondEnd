/**
 * Delete Client Use Case
 * Handles business logic for soft deleting clients
 */

import { Injectable } from '@angular/core';
import { Observable, map, catchError, of, switchMap } from 'rxjs';
import { ClientRepository } from '../../repositories/client.repository';
import { ClientEntity } from '../../entities/client.entity';
import {
  UseCaseResult,
  ClientDeletedEvent
} from '../../models/client.models';

@Injectable({
  providedIn: 'root'
})
export class DeleteClientUseCase {
  constructor(private clientRepository: ClientRepository) {}

  execute(clientId: number, userId: string): Observable<UseCaseResult<void>> {
    console.log(`Delete UseCase: Attempting to delete client ${clientId} by user ${userId}`);

    // Appeler directement la suppression sans vérification préalable
    // Le backend gérera les validations nécessaires
    return this.deleteClient(clientId).pipe(
      map(() => {
        console.log(`Delete UseCase: Successfully deleted client ${clientId}`);
        return {
          success: true,
          data: undefined,
          events: [this.createDeleteEvent(clientId, userId)]
        };
      }),
      catchError(error => {
        console.error(`Delete UseCase: Failed to delete client ${clientId}:`, error);
        // Propager l'erreur HTTP directement sans la transformer
        throw error;
      })
    );
  }

  private getExistingClient(clientId: number): Observable<ClientEntity | null> {
    return this.clientRepository.getById(clientId);
  }

  private deleteClient(clientId: number): Observable<void> {
    return this.clientRepository.delete(clientId);
  }

  private createDeleteEvent(clientId: number, userId: string): ClientDeletedEvent {
    return {
      type: 'CLIENT_DELETED',
      clientId: clientId,
      clientUniqueId: '', // Ne pas renseigner si on n'a pas l'entité
      userId,
      timestamp: new Date(),
      data: {
        name: '', // Le backend aura ces informations
        email: ''
      }
    };
  }

  private createDomainEvent(client: ClientEntity, userId: string): ClientDeletedEvent {
    return {
      type: 'CLIENT_DELETED',
      clientId: client.id,
      clientUniqueId: client.clientId,
      userId,
      timestamp: new Date(),
      data: {
        name: client.name,
        email: client.email
      }
    };
  }

}