import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import {
  TimelineResponse,
  TimelineFilters,
  TimelineExportRequest,
  TimelineExportResponse
} from '../../domain/models/crm.models';
import { TimelineRepository } from '../../domain/repositories/timeline.repository';
import { ApiService } from '../../core/api/api.service';

@Injectable({
  providedIn: 'root'
})
export class ApiTimelineRepository extends TimelineRepository {
  constructor(private apiService: ApiService) {
    super();
  }

  getClientTimeline(clientId: number, filters?: TimelineFilters): Observable<TimelineResponse> {
    const params: { [key: string]: string | number | boolean } = {};

    if (filters) {
      if (filters.type) {
        params['type'] = filters.type;
      }
      if (filters.user_id) {
        params['user_id'] = filters.user_id;
      }
      if (filters.date_from) {
        params['date_from'] = filters.date_from;
      }
      if (filters.date_to) {
        params['date_to'] = filters.date_to;
      }
      if (filters.per_page) {
        params['per_page'] = filters.per_page;
      }
      if (filters.page) {
        params['page'] = filters.page;
      }
    }

    return this.apiService.get<{ data: TimelineResponse }>(`clients/${clientId}/timeline`, { params })
      .pipe(
        map(response => response.data)
      );
  }

  exportClientTimeline(clientId: number, request: TimelineExportRequest): Observable<TimelineExportResponse> {
    const params: { [key: string]: string | number | boolean } = {};

    if (request.format) {
      params['format'] = request.format;
    }
    if (request.type) {
      params['type'] = request.type;
    }
    if (request.date_from) {
      params['date_from'] = request.date_from;
    }
    if (request.date_to) {
      params['date_to'] = request.date_to;
    }

    return this.apiService.get<{ data: TimelineExportResponse }>(`clients/${clientId}/timeline/export`, { params })
      .pipe(
        map(response => response.data)
      );
  }

  downloadClientTimelineFile(clientId: number, request: TimelineExportRequest): Observable<Blob> {
    const params: { [key: string]: string | number | boolean } = {
      download: 'true'
    };

    if (request.format) {
      params['format'] = request.format;
    }
    if (request.type) {
      params['type'] = request.type;
    }
    if (request.date_from) {
      params['date_from'] = request.date_from;
    }
    if (request.date_to) {
      params['date_to'] = request.date_to;
    }

    return this.apiService.get<Blob>(`clients/${clientId}/timeline/export`, {
      params,
      responseType: 'blob'
    });
  }
}