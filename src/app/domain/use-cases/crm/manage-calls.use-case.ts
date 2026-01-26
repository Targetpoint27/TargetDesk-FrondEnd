import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { CrmRepository } from '../../repositories/crm.repository';
import {
  ClientCall,
  CreateCallRequest,
  UpdateCallRequest,
  CallFilters,
  CallsResponse,
  DashboardCallsResponse
} from '../../models/crm.models';

@Injectable({
  providedIn: 'root'
})
export class ManageCallsUseCase {

  constructor(private crmRepository: CrmRepository) {}

  /**
   * Récupère les appels d'un client
   */
  getClientCalls(clientId: number, filters?: CallFilters): Observable<CallsResponse> {
    return this.crmRepository.getClientCalls(clientId, filters);
  }

  /**
   * Enregistre un nouvel appel
   */
  createCall(clientId: number, request: CreateCallRequest): Observable<ClientCall> {
    // Validation métier
    if (!request.phone_number?.trim()) {
      throw new Error('Le numéro de téléphone est obligatoire');
    }

    if (!request.subject?.trim()) {
      throw new Error('Le sujet de l\'appel est obligatoire');
    }

    if (request.duration < 0) {
      throw new Error('La durée ne peut pas être négative');
    }

    // Si un suivi est requis, on doit avoir une date
    if (request.follow_up_required && !request.follow_up_date) {
      throw new Error('La date de suivi est obligatoire si un suivi est requis');
    }

    return this.crmRepository.createCall(clientId, request);
  }

  /**
   * Récupère un appel spécifique
   */
  getCall(callId: number): Observable<ClientCall> {
    return this.crmRepository.getCall(callId);
  }

  /**
   * Met à jour un appel
   */
  updateCall(callId: number, request: UpdateCallRequest): Observable<ClientCall> {
    return this.crmRepository.updateCall(callId, request);
  }

  /**
   * Supprime un appel
   */
  deleteCall(callId: number): Observable<void> {
    return this.crmRepository.deleteCall(callId);
  }

  /**
   * Marque le suivi comme terminé
   */
  completeFollowUp(callId: number): Observable<ClientCall> {
    return this.crmRepository.completeCallFollowUp(callId);
  }

  /**
   * Récupère les appels nécessitant un suivi
   */
  getFollowUps(): Observable<DashboardCallsResponse> {
    return this.crmRepository.getCallsFollowUps();
  }
}