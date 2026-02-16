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
  public selectedAgent: AgentTeamView | null = null;

  // ✅ Changed to 'public' so the HTML can access it.
  // ✅ Renamed to 'facade' to match your HTML usage: (facade.agentCalls$ | async)
  constructor(public facade: SupervisorFacade) {
    this.team$ = this.facade.teamView$;
    this.queue$ = this.facade.masterQueue$;
    this.isLoading$ = this.facade.isLoading$;
  }

  ngOnInit(): void {
    this.facade.loadDashboardData();
  }

  viewAgentDetails(agent: AgentTeamView): void {
    this.selectedAgent = agent;
    this.facade.loadAgentActiveCalls(agent.id); 
  }

  openReassign(callId: string): void {
    this.activeCallId = callId;
    this.isReassignModalOpen = true;
  }

  handleReassignment(event: {agentId: number, reason: string}): void {
    if (this.activeCallId) {
      this.facade.reassignCall(this.activeCallId, event.agentId, event.reason)
        .subscribe({
          next: () => {
            this.isReassignModalOpen = false;
            this.activeCallId = null;
          }
        });
    }
  }

  getLoadClass(status: string): string {
    if (!status) return 'bg-green-100 text-green-700 border-green-200';
    switch (status.toLowerCase()) {
      case 'rouge': return 'bg-red-100 text-red-700 border-red-200';
      case 'orange': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-green-100 text-green-700 border-green-200';
    }
  }
}