import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, forkJoin, throwError } from 'rxjs';
import { finalize, tap, catchError, map } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { SupervisorRepository } from '../../../domain/repositories/supervisor.repository';
import { 
  AgentTeamView, 
  TeamStats, 
  SupervisorComplaint, 
  ReassignCallRequest 
} from '../../../domain/models/supervisor.model';
import { Call, CallUrgency } from '../../../domain/models/call.model';
import { LoggingService } from '../../../core/logging/logging.service';
import { NotificationService } from '../../../core/services/notification.service';

@Injectable({
  providedIn: 'root'
})
export class SupervisorFacade {
  // State Management
  private teamViewSubject = new BehaviorSubject<AgentTeamView[]>([]);
  public teamView$ = this.teamViewSubject.asObservable();

  private masterQueueSubject = new BehaviorSubject<Call[]>([]);
  public masterQueue$ = this.masterQueueSubject.asObservable();

  private statsSubject = new BehaviorSubject<TeamStats | null>(null);
  public stats$ = this.statsSubject.asObservable();

  private complaintsSubject = new BehaviorSubject<SupervisorComplaint[]>([]);
  public complaints$ = this.complaintsSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  public isLoading$ = this.loadingSubject.asObservable();

  private agentCallsSubject = new BehaviorSubject<Call[]>([]);
  public agentCalls$ = this.agentCallsSubject.asObservable();

  private pendingQueueSubject = new BehaviorSubject<Call[]>([]);
  public pendingQueue$ = this.pendingQueueSubject.asObservable();

  constructor(
    private supervisorRepo: SupervisorRepository,
    private loggingService: LoggingService,
    private notificationService: NotificationService
  ) {}

  /**
   * Loads the core supervisor dashboard data (Team + Queue)
   */
  loadDashboardData(): void {
    this.loadingSubject.next(true);
    forkJoin({
      team: this.supervisorRepo.getTeamView(),
      queue: this.supervisorRepo.getMasterQueue()
    }).pipe(
      finalize(() => this.loadingSubject.next(false))
    ).subscribe({
      next: (data) => {
        this.teamViewSubject.next(data.team);
        this.masterQueueSubject.next(data.queue);
      },
      error: (err) => this.loggingService.error('SupervisorFacade: Dashboard load failed', { error: err } as any)
    });
  }

  /**
   * Fetches team statistics for a specific period
   */
  loadStats(period: string = 'month'): void {
    this.supervisorRepo.getTeamStats(period).subscribe({
      next: (stats) => this.statsSubject.next(stats),
      error: (err) => this.loggingService.error('SupervisorFacade: Stats load failed', { error: err } as any)
    });
  }

  /**
   * Reassigns a call using the Repository and refreshes local state
   */
  public reassignCall(callId: string, agentId: number, reason: string): Observable<Call> {
    const request: ReassignCallRequest = { 
      new_agent_id: agentId, // Matches supervisor.model.ts
      reason: reason 
    };

    // Use the Repository method to maintain modularity
    return this.supervisorRepo.reassignCall(Number(callId), request).pipe(
      tap(() => {
        this.notificationService.success('Appel réassigné avec succès');
        this.loadDashboardData(); // Refreshes the queue and agent cards
      }),
      catchError((err: HttpErrorResponse) => {
        this.notificationService.error('Erreur lors de la réassignation');
        
        // Use 'as any' to bypass the restrictive LogContext check for the 'message' property
        this.loggingService.error('SupervisorFacade: Reassignment failed', { 
          message: err.message,
          status: err.status 
        } as any); 
        
        return throwError(() => err); // Correct creation function usage
      })
    );
  }

  /**
   * Loads team complaints
   */
  loadComplaints(): void {
    this.supervisorRepo.getTeamComplaints().subscribe({
      next: (complaints) => this.complaintsSubject.next(complaints),
      error: (err) => this.loggingService.error('SupervisorFacade: Complaints load failed', { error: err } as any)
    });
  }

  /**
    * Uses your existing API to fetch sessions for the drawer
  */
  loadAgentActiveCalls(agentId: number): void {
    this.supervisorRepo.getAgentActiveCalls(agentId).subscribe({
      // ✅ Added Call[] type to the parameter
      next: (calls: Call[]) => {
        this.agentCallsSubject.next(calls);
      },
      // ✅ Added any or Error type to the parameter
      error: (err: any) => {
        this.loggingService.error('Failed to load agent calls', { error: err } as any);
      }
    });
  }

  /**
 * Loads and processes the "File à Traiter"
 * Filter: 'a_traiter' or 'a_rappeler'
 * Sort: Urgency (Desc) then CreatedAt (Asc)
 */
  public loadPendingQueue(): void {
    this.loadingSubject.next(true);
    
    this.supervisorRepo.getMasterQueue().pipe(
      map(calls => {
        // ✅ Step 1: Filter by status
        return calls.filter(c => c.status === 'a_traiter' || c.status === 'a_rappeler');
      }),
      map(calls => {
        // ✅ Step 2: Multi-level Sorting
        return calls.sort((a, b) => {
          const priorityMap = { 'critique': 1, 'urgent': 2, 'normal': 3, 'faible': 4 };
          
          // Primary Sort: Urgency
          const aPriority = priorityMap[a.urgency] || 3;
          const bPriority = priorityMap[b.urgency] || 3;
          
          if (aPriority !== bPriority) {
            return aPriority - bPriority; // Lower number (1) comes first
          }
          
          // Secondary Sort: Time Elapsed (Oldest First)
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });
      }),
      finalize(() => this.loadingSubject.next(false))
    ).subscribe({
      next: (processedCalls) => this.pendingQueueSubject.next(processedCalls),
      error: (err) => this.loggingService.error('Failed to load pending queue', { error: err } as any)
    });
  }

  /**
   * ✅ Action: Update Urgency
   */
  public changeUrgency(callId: number, urgency: CallUrgency): void {
    this.supervisorRepo.updateCallUrgency(callId, urgency).subscribe({
      next: () => {
        this.notificationService.success('Urgence mise à jour');
        this.loadPendingQueue(); // Refresh the list
      },
      error: (err) => this.notificationService.error('Erreur lors du changement d\'urgence')
    });
  }

  /**
   * ✅ Action: Notify Agent (The "Nudge")
   */
  public nudgeAgent(agentId: number, callId: string): void {
    this.supervisorRepo.notifyAgent(agentId, callId).subscribe({
      next: () => this.notificationService.success('Agent notifié'),
      error: (err) => this.notificationService.error('Erreur de notification')
    });
  }
}