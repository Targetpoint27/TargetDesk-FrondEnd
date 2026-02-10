import { Observable } from 'rxjs';
import {
  Call,
  CreateCallRequest,
  UpdateCallRequest,
  ChangeStatusRequest,
  ScheduleCallbackRequest,
  CloseCallRequest,
  CallbackResultRequest,
  CallNote
} from '../models/call.model';

export abstract class CallRepository {
  // Get calls
  abstract getMyQueue(): Observable<Call[]>;
  abstract getDepartmentQueue(): Observable<Call[]>;
  abstract getCallbacks(): Observable<Call[]>;
  abstract searchCalls(query: string): Observable<Call[]>;
  abstract getAllCalls(): Observable<Call[]>;
  
  // Single call operations
  abstract getCallDetails(id: number): Observable<Call>;
  abstract createCall(data: CreateCallRequest): Observable<Call>;
  abstract updateCall(id: number, data: UpdateCallRequest): Observable<Call>;
  abstract changeStatus(id: number, data: ChangeStatusRequest): Observable<Call>;
  abstract closeCall(id: number, data: CloseCallRequest): Observable<Call>;
  abstract assignToMe(id: number): Observable<Call>;
  
  // Callback operations
  abstract scheduleCallback(id: number, data: ScheduleCallbackRequest): Observable<Call>;
  abstract recordCallbackResult(id: number, data: CallbackResultRequest): Observable<Call>;
  
  // Link to client
  abstract linkClient(id: number, clientId: number): Observable<Call>;
  
  // Notes
  abstract getNotes(callId: number): Observable<CallNote[]>;
  abstract addNote(callId: number, data: { note: string; is_important?: boolean }): Observable<CallNote>;

  abstract search(query: string): Observable<any>;
abstract filter(filters: any): Observable<any>;
}