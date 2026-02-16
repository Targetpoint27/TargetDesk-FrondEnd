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

  loadStats(period: string = 'month'): void {
    this.supervisorRepo.getTeamStats(period).subscribe({
      next: (stats) => this.statsSubject.next(stats),
      error: (err) => this.loggingService.error('SupervisorFacade: Stats load failed', { error: err } as any)
    });
  }

  public reassignCall(callId: string, agentId: number, reason: string): Observable<Call> {
    const request: ReassignCallRequest = { 
      new_agent_id: agentId,
      reason: reason 
    };

    return this.supervisorRepo.reassignCall(Number(callId), request).pipe(
      tap(() => {
        this.notificationService.success('Appel réassigné avec succès');
        this.loadDashboardData();
        this.loadComplaints();
      }),
      catchError((err: HttpErrorResponse) => {
        this.notificationService.error('Erreur lors de la réassignation');
        this.loggingService.error('SupervisorFacade: Reassignment failed', { 
          message: err.message,
          status: err.status 
        } as any); 
        return throwError(() => err);
      })
    );
  }

  public loadComplaints(): void {
  this.supervisorRepo.getTeamComplaints().pipe(
    map((response: any) => {
      // ✅ Handle Laravel's wrapped response
      const complaints = Array.isArray(response) ? response : (response.data || []);
      
      return complaints.sort((a: SupervisorComplaint, b: SupervisorComplaint) => {
        const severityMap: Record<string, number> = { 
          'critique': 1, 
          'eleve': 2, 
          'moyen': 3, 
          'faible': 4 
        };
        const aSev = severityMap[a.severity] || 4;
        const bSev = severityMap[b.severity] || 4;
        if (aSev !== bSev) return aSev - bSev;
        return new Date(a.sla_deadline).getTime() - new Date(b.sla_deadline).getTime();
      });
    })
  ).subscribe(processed => this.complaintsSubject.next(processed));
}

  loadAgentActiveCalls(agentId: number): void {
    this.supervisorRepo.getAgentActiveCalls(agentId).subscribe({
      next: (calls: Call[]) => this.agentCallsSubject.next(calls),
      error: (err: any) => this.loggingService.error('Failed to load agent calls', { error: err } as any)
    });
  }

  public loadPendingQueue(): void {
    this.loadingSubject.next(true);
    this.supervisorRepo.getMasterQueue().pipe(
      map((calls: Call[]) => calls.filter((c: Call) => c.status === 'a_traiter' || c.status === 'a_rappeler')),
      map((calls: Call[]) => {
        return calls.sort((a: Call, b: Call) => {
          const priorityMap: Record<string, number> = { 'critique': 1, 'urgent': 2, 'normal': 3, 'faible': 4 };
          const aPriority = priorityMap[a.urgency] || 3;
          const bPriority = priorityMap[b.urgency] || 3;
          if (aPriority !== bPriority) return aPriority - bPriority;
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });
      }),
      finalize(() => this.loadingSubject.next(false))
    ).subscribe({
      next: (processedCalls: Call[]) => this.pendingQueueSubject.next(processedCalls),
      error: (err: any) => this.loggingService.error('Failed to load pending queue', { error: err } as any)
    });
  }

  public changeUrgency(callId: number, urgency: CallUrgency): void {
    this.supervisorRepo.updateCallUrgency(callId, urgency).subscribe({
      next: () => {
        this.notificationService.success('Urgence mise à jour');
        this.loadPendingQueue();
      },
      error: () => this.notificationService.error('Erreur lors du changement d\'urgence')
    });
  }

  public nudgeAgent(agentId: number, callId: string): void {
    this.supervisorRepo.notifyAgent(agentId, callId).subscribe({
      next: () => this.notificationService.success('Agent notifié'),
      error: () => this.notificationService.error('Erreur de notification')
    });
  }

  public complaintStats$ = this.complaints$.pipe(
    map((complaints: SupervisorComplaint[]) => {
      const total = complaints.length;
      const open = complaints.filter(c => c.status === 'ouverte').length;
      const inProgress = complaints.filter(c => c.status === 'en_analyse').length;
      const resolved = complaints.filter(c => c.status === 'resolue' || c.status === 'cloture').length;
      const overdue = complaints.filter(c => c.sla_status === 'overdue').length;
      const slaRate = total > 0 ? Math.round(((total - overdue) / total) * 100) : 100;
      return { total, open, inProgress, resolved, overdue, slaRate };
    })
  );

// Change return type from : void to : Observable<any>
  public escalate(id: number): Observable<any> {
    return this.supervisorRepo.escalateComplaint(id).pipe(
      tap(() => {
        this.notificationService.success('Réclamation escaladée');
        this.loadComplaints();
      }),
      catchError(err => {
        this.notificationService.error('Erreur lors de l\'escalade');
        return throwError(() => err);
      })
    );
  }

  public validate(id: number): Observable<any> {
    return this.supervisorRepo.validateResolution(id).pipe(
      tap(() => {
        this.notificationService.success('Résolution validée');
        this.loadComplaints();
      }),
      catchError(err => {
        this.notificationService.error('Erreur lors de la validation');
        return throwError(() => err);
      })
    );
  }

  public close(id: number): Observable<any> {
    return this.supervisorRepo.closeComplaint(id).pipe(
      tap(() => {
        this.notificationService.success('Réclamation clôturée');
        this.loadComplaints();
      }),
      catchError(err => {
        this.notificationService.error('Erreur lors de la clôture');
        return throwError(() => err);
      })
    );
  }

  /**
   * ✅ Logic for Chart Visualization
   * Formats data for "Évolution du nombre de réclamations"
   */
  public complaintChartData$ = this.complaints$.pipe(
    map((complaints: SupervisorComplaint[]) => {
      // We group complaints by their creation date
      const grouped = complaints.reduce((acc: Record<string, number>, curr) => {
        // Use the call date if complaint date isn't directly available
        const date = new Date(curr.call.created_at).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit'
        });
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

      return {
        labels: Object.keys(grouped),
        values: Object.values(grouped) as number[]
      };
    })
  );
}