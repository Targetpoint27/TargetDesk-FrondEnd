import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { CrmRepository } from '../../repositories/crm.repository';
import { TimelineResponse, TimelineFilters } from '../../models/crm.models';

@Injectable({
  providedIn: 'root'
})
export class GetClientTimelineUseCase {

  constructor(private crmRepository: CrmRepository) {}

  /**
   * Récupère la timeline chronologique d'un client avec filtres
   */
  execute(clientId: number, filters?: TimelineFilters): Observable<TimelineResponse> {
    return this.crmRepository.getClientTimeline(clientId, filters)
      .pipe(
        map(response => {
          // On peut ajouter ici de la logique métier si nécessaire
          // Par exemple, formater les dates, calculer des durées, etc.
          return response;
        })
      );
  }
}