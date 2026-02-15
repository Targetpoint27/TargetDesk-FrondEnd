import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SupervisorFacade } from '../../../supervisor/supervisor.facade';
import { Observable } from 'rxjs';
import { AgentTeamView } from '../../../../../domain/models/supervisor.model';
import { Call } from '../../../../../domain/models/call.model';
import { ReassignModalComponent } from './reassign-modal/reassign-modal.component';

@Component({
  selector: 'app-supervisor-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, ReassignModalComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class SupervisorDashboardComponent implements OnInit {
  public team$!: Observable<AgentTeamView[]>;
  public queue$!: Observable<Call[]>;
  public isLoading$!: Observable<boolean>;

  public isReassignModalOpen = false;
  public activeCallId: string | null = null;

  constructor(private supervisorFacade: SupervisorFacade) {
    this.team$ = this.supervisorFacade.teamView$;
    this.queue$ = this.supervisorFacade.masterQueue$;
    this.isLoading$ = this.supervisorFacade.isLoading$;
  }

  ngOnInit(): void {
    this.supervisorFacade.loadDashboardData();
  }

  openReassign(callId: string): void {
    this.activeCallId = callId;
    this.isReassignModalOpen = true;
  }

  handleReassignment(event: {agentId: number, reason: string}): void {
    if (this.activeCallId) {
      this.supervisorFacade.reassignCall(this.activeCallId, event.agentId, event.reason)
        .subscribe({
          next: () => {
            this.isReassignModalOpen = false;
            this.activeCallId = null;
          }
        });
    }
  }

  getLoadClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'rouge': return 'bg-red-100 text-red-700 border-red-200';
      case 'orange': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-green-100 text-green-700 border-green-200';
    }
  }
}