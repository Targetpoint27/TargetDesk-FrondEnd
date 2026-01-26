import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import {
  TimelineResponse,
  TimelineFilters,
  TimelineExportRequest,
  TimelineExportResponse
} from '../../models/crm.models';
import { TimelineRepository } from '../../repositories/timeline.repository';

@Injectable({
  providedIn: 'root'
})
export class ManageTimelineUseCase {
  constructor(private timelineRepository: TimelineRepository) {}

  getClientTimeline(clientId: number, filters?: TimelineFilters): Observable<TimelineResponse> {
    return this.timelineRepository.getClientTimeline(clientId, filters);
  }

  exportTimeline(clientId: number, request: TimelineExportRequest): Observable<TimelineExportResponse> {
    return this.timelineRepository.exportClientTimeline(clientId, request);
  }

  downloadTimelineFile(clientId: number, request: TimelineExportRequest): Observable<Blob> {
    return this.timelineRepository.downloadClientTimelineFile(clientId, request);
  }
}