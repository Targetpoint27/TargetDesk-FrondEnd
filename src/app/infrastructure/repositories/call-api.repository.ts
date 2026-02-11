import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CallRepository } from '../../domain/repositories/call.repository';
import {
  Call,
  CreateCallRequest,
  UpdateCallRequest,
  ChangeStatusRequest,
  ScheduleCallbackRequest,
  CloseCallRequest,
  CallbackResultRequest,
  StoreMissedCallRequest,
  CallNote,
  CallResponse
} from '../../domain/models/call.model';
import { ApiService } from '../../core/api/api.service';
import { CallMapper } from '../mappers/call.mapper';

@Injectable()
export class CallApiRepository extends CallRepository {
  private readonly BASE_PATH = '/call-center';

  constructor(
    private apiService: ApiService,
    private mapper: CallMapper
  ) {
    super();
  }

  getMyQueue(): Observable<Call[]> {
    return this.apiService
      .get<any>(`${this.BASE_PATH}/calls/my-queue`)
      .pipe(
        map(response => {
          const calls = response.data?.calls || [];
          return calls.map((call: any) => this.mapper.toDomain(call));
        })
      );
  }

  getDepartmentQueue(): Observable<Call[]> {
    return this.apiService
      .get<any>(`${this.BASE_PATH}/calls/department-queue`)
      .pipe(
        map(response => {
          // Backend structure: { success, message, data: { total, unassigned_count, ..., calls: [...] } }
          const calls = response.data?.calls || [];
          return calls.map((call: any) => this.mapper.toDomain(call));
        })
      );
  }

  searchCalls(query: string): Observable<Call[]> {
    return this.apiService
      .get<any>(`${this.BASE_PATH}/calls/search`, {
        params: { q: query }
      })
      .pipe(
        map(response => {
          const calls = response.data?.calls || response.data || [];
          return Array.isArray(calls) ? calls.map((call: any) => this.mapper.toDomain(call)) : [];
        })
      );
  }

  getAllCalls(): Observable<Call[]> {
    return this.apiService
      .get<any>(`${this.BASE_PATH}/calls`)
      .pipe(
        map(response => {
          const calls = response.data?.calls || response.data || [];
          return Array.isArray(calls) ? calls.map((call: any) => this.mapper.toDomain(call)) : [];
        })
      );
  }

  getCallDetails(id: number): Observable<Call> {
    return this.apiService
      .get<CallResponse>(`${this.BASE_PATH}/calls/${id}`)
      .pipe(
        map(response => this.mapper.toDomain(response.data))
      );
  }

  createCall(data: CreateCallRequest): Observable<Call> {
    return this.apiService
      .post<CallResponse>(`${this.BASE_PATH}/calls`, data)
      .pipe(
        map(response => this.mapper.toDomain(response.data))
      );
  }

  updateCall(id: number, data: UpdateCallRequest): Observable<Call> {
    return this.apiService
      .put<CallResponse>(`${this.BASE_PATH}/calls/${id}`, data)
      .pipe(
        map(response => this.mapper.toDomain(response.data))
      );
  }

  changeStatus(id: number, data: ChangeStatusRequest): Observable<Call> {
    return this.apiService
      .put<CallResponse>(`${this.BASE_PATH}/calls/${id}/status`, data)
      .pipe(
        map(response => this.mapper.toDomain(response.data))
      );
  }

  closeCall(id: number, data: CloseCallRequest): Observable<Call> {
    return this.apiService
      .post<CallResponse>(`${this.BASE_PATH}/calls/${id}/close`, data)
      .pipe(
        map(response => this.mapper.toDomain(response.data))
      );
  }

  assignToMe(id: number): Observable<Call> {
    return this.apiService
      .post<CallResponse>(`${this.BASE_PATH}/calls/${id}/assign-to-me`, {})
      .pipe(
        map(response => this.mapper.toDomain(response.data))
      );
  }

  linkClient(id: number, clientId: number): Observable<Call> {
    return this.apiService
      .post<CallResponse>(`${this.BASE_PATH}/calls/${id}/link-client`, { client_id: clientId })
      .pipe(
        map(response => this.mapper.toDomain(response.data))
      );
  }

  getNotes(callId: number): Observable<CallNote[]> {
    return this.apiService
      .get<any>(`${this.BASE_PATH}/calls/${callId}/notes`)
      .pipe(
        map(response => response.data?.notes || response.data || [])
      );
  }

  addNote(callId: number, data: { note: string; is_important?: boolean }): Observable<CallNote> {
    return this.apiService.post<any>(`/call-center/calls/${callId}/notes`, data).pipe(
      map(response => response.data)
    );
  }

  search(query: string): Observable<any> {
    return this.apiService
      .get<any>(`${this.BASE_PATH}/calls/search`, {
        params: { q: query }
      })
      .pipe(
        map(response => response)
      );
  }

  filter(filters: any): Observable<any> {
    const params: any = {};
    Object.keys(filters).forEach(key => {
      if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
        params[`filter[${key}]`] = filters[key];
      }
    });
    return this.apiService
      .get<any>(`${this.BASE_PATH}/calls`, { params })
      .pipe(
        map(response => response)
      );
  }

  getCallbacks(): Observable<any> {
  return this.apiService
    .get<any>(`${this.BASE_PATH}/calls/callbacks`)
    .pipe(
      map(response => {
        // Backend returns { success, message, data: { total, overdue_count, calls: [...] } }
        const data = response.data || {};
        const calls = data.calls || [];
        return {
          total: data.total || 0,
          overdueCount: data.overdue_count || 0,
          calls: calls.map((call: any) => this.mapper.toDomain(call))
        };
      })
    );
  }

  storeMissedCall(data: StoreMissedCallRequest): Observable<Call> {
  return this.apiService
    .post<CallResponse>(`${this.BASE_PATH}/calls/missed`, data)
    .pipe(
      map(response => this.mapper.toDomain(response.data))
    );
  }

  scheduleCallback(id: number, data: ScheduleCallbackRequest): Observable<Call> {
    return this.apiService
      .put<CallResponse>(`${this.BASE_PATH}/calls/${id}/schedule`, data)
      .pipe(
        map(response => this.mapper.toDomain(response.data))
      );
  }

  recordCallbackResult(id: number, data: CallbackResultRequest): Observable<Call> {
    return this.apiService
      .post<CallResponse>(`${this.BASE_PATH}/calls/${id}/callback-result`, data)
      .pipe(
        map(response => this.mapper.toDomain(response.data))
      );
  }
}