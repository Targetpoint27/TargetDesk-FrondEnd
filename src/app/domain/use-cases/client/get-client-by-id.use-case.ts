/**
 * Get Client By ID Use Case
 * Retrieves a single client with complete data including categories
 */

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ClientRepository } from '../../repositories/client.repository';
import { ClientEntity } from '../../entities/client.entity';

@Injectable({
  providedIn: 'root'
})
export class GetClientByIdUseCase {
  constructor(private clientRepository: ClientRepository) {}

  execute(clientId: number): Observable<ClientEntity | null> {
    return this.clientRepository.getById(clientId);
  }
}