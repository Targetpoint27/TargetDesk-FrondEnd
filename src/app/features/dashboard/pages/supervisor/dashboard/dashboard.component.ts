import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SupervisorFacade } from '../../../supervisor/supervisor.facade';
import { Observable } from 'rxjs';
import { AgentTeamView } from '../../../../../domain/models/supervisor.model';
import { Call, CallUrgency } from '../../../../../domain/models/call.model';
import { ReassignModalComponent } from './reassign-modal/reassign-modal.component';
import { TimeElapsedPipe } from '../../../../../shared/pipes/time-elapsed.pipe';

@Component({
  selector: 'app-supervisor-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReassignModalComponent, TimeElapsedPipe],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class SupervisorDashboardComponent implements OnInit {
  public team$!: Observable<AgentTeamView[]>;
  public queue$!: Observable<Call[]>;
  public pendingQueue$!: Observable<Call[]>;
  public isLoading$!: Observable<boolean>;

  public isReassignModalOpen = false;
  public activeCallId: string | null = null;
  public selectedAgent: AgentTeamView | null = null;

  public filters = {
    departmentId: '',
    urgency: '',
    isAssigned: ''
  };

  constructor(public facade: SupervisorFacade) {
    this.team$ = this.facade.teamView$;
    this.queue$ = this.facade.masterQueue$;
    this.pendingQueue$ = this.facade.pendingQueue$;
    this.isLoading$ = this.facade.isLoading$;
  }

  ngOnInit(): void {
    this.facade.loadDashboardData();
    this.facade.loadPendingQueue();
  }

  applyFilters(): void {
    console.log('Applying filters:', this.filters);
  }

  viewAgentDetails(agent: AgentTeamView): void {
    this.selectedAgent = agent;
    this.facade.loadAgentActiveCalls(agent.id); 
  }

  onNudgeAgent(agentId: number | undefined, callId: string): void {
    if (agentId) {
      this.facade.nudgeAgent(agentId, callId);
    }
  }

  onUrgencyChange(callId: number, event: any): void {
    const newUrgency = event.target.value as CallUrgency;
    this.facade.changeUrgency(callId, newUrgency);
  }

  isOverdue(createdAt: string): boolean {
    const startTime = new Date(createdAt).getTime();
    const now = new Date().getTime();
    return (now - startTime) > 300000; 
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
            this.facade.loadPendingQueue();
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