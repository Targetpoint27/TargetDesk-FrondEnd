import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, forkJoin, throwError } from 'rxjs';
import { finalize, tap, catchError } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { SupervisorRepository } from '../../../domain/repositories/supervisor.repository';
import { 
  AgentTeamView, 
  TeamStats, 
  SupervisorComplaint, 
  ReassignCallRequest 
} from '../../../domain/models/supervisor.model';
import { Call } from '../../../domain/models/call.model';
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
}