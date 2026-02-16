import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService, ApiResponse } from '../../core/api/api.service';
import { SupervisorRepository } from '../../domain/repositories/supervisor.repository';
import { 
  AgentTeamView, 
  TeamStats, 
  SupervisorComplaint, 
  ReassignCallRequest 
} from '../../domain/models/supervisor.model';
import { Call } from '../../domain/models/call.model';

@Injectable({
  providedIn: 'root'
})
export class SupervisorApiRepository extends SupervisorRepository {
  private readonly BASE_PATH = '/call-center/supervisor';

  constructor(private apiService: ApiService) {
    super();
  }

  getTeamView(): Observable<AgentTeamView[]> {
    return this.apiService.get<ApiResponse<AgentTeamView[]>>(`${this.BASE_PATH}/team-view`)
      .pipe(map(res => res.data));
  }

  getTeamStats(period: string = 'month'): Observable<TeamStats> {
    return this.apiService.get<ApiResponse<TeamStats>>(`${this.BASE_PATH}/team-stats`, { 
      params: { period } 
    }).pipe(map(res => res.data));
  }

  getMasterQueue(): Observable<Call[]> {
    return this.apiService.get<ApiResponse<Call[]>>(`${this.BASE_PATH}/queue`)
      .pipe(map(res => res.data));
  }

  reassignCall(callId: number, data: ReassignCallRequest): Observable<Call> {
    return this.apiService.put<ApiResponse<Call>>(`${this.BASE_PATH}/calls/${callId}/reassign`, data)
      .pipe(map(res => res.data));
  }

  override getAgentActiveCalls(agentId: number): Observable<Call[]> {
    return this.apiService.get<Call[]>(`/call-center/supervisor/agents/${agentId}/calls`);
  }

  override updateCallUrgency(callId: number, urgency: string): Observable<void> {
    return this.apiService.patch<void>(`/call-center/supervisor/calls/${callId}/urgency`, { 
      urgency 
    });
  }

  override notifyAgent(agentId: number, callId: string): Observable<void> {
    return this.apiService.post<void>(`/call-center/supervisor/agents/${agentId}/notify`, { 
      call_id: callId 
    });
  }

  override getTeamComplaints(): Observable<SupervisorComplaint[]> {
    return this.apiService.get<SupervisorComplaint[]>('/call-center/supervisor/complaints');
  }

  override escalateComplaint(id: number): Observable<void> {
    return this.apiService.post<void>(`/call-center/supervisor/complaints/${id}/escalate`, {});
  }

  override validateResolution(id: number): Observable<void> {
    return this.apiService.post<void>(`/call-center/supervisor/complaints/${id}/validate`, {});
  }

  override closeComplaint(id: number): Observable<void> {
    return this.apiService.post<void>(`/call-center/supervisor/complaints/${id}/close`, {});
  }
}