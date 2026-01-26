import { Observable } from 'rxjs';

import {
  TimelineResponse,
  TimelineFilters,
  TimelineExportRequest,
  TimelineExportResponse
} from '../models/crm.models';

export abstract class TimelineRepository {
  abstract getClientTimeline(clientId: number, filters?: TimelineFilters): Observable<TimelineResponse>;
  abstract exportClientTimeline(clientId: number, request: TimelineExportRequest): Observable<TimelineExportResponse>;
  abstract downloadClientTimelineFile(clientId: number, request: TimelineExportRequest): Observable<Blob>;
}