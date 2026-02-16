import { Observable } from 'rxjs';
import { 
  AgentTeamView, 
  TeamStats, 
  SupervisorComplaint, 
  ReassignCallRequest 
} from '../models/supervisor.model';
import { Call } from '../models/call.model';

export abstract class SupervisorRepository {
  abstract getTeamView(): Observable<AgentTeamView[]>;
  abstract getTeamStats(period: string): Observable<TeamStats>;
  abstract getMasterQueue(): Observable<Call[]>;
  abstract getTeamComplaints(): Observable<SupervisorComplaint[]>;
  abstract reassignCall(callId: number, data: ReassignCallRequest): Observable<Call>;
  abstract getAgentActiveCalls(agentId: number): Observable<Call[]>;
  abstract updateCallUrgency(callId: number, urgency: string): Observable<void>;
  abstract notifyAgent(agentId: number, callId: string): Observable<void>;
}