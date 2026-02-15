import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgentTeamView } from '../../../../../../domain/models/supervisor.model';

@Component({
  selector: 'app-reassign-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reassign-modal.component.html',
  styleUrl: './reassign-modal.component.scss'
})
export class ReassignModalComponent {
  @Input() callId!: string;
  @Input() agents: AgentTeamView[] = []; // Shows charge actuelle
  @Output() confirm = new EventEmitter<{agentId: number, reason: string}>();
  @Output() cancel = new EventEmitter<void>();

  selectedAgentId: number | null = null;
  reason: string = ''; // Requirement: Motif de réassignation

  onConfirm() {
    if (this.selectedAgentId) {
      this.confirm.emit({ agentId: this.selectedAgentId, reason: this.reason });
    }
  }
  
  getLoadClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'rouge': return 'bg-red-100 text-red-700 border-red-200';
      case 'orange': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-green-100 text-green-700 border-green-200';
    }
  }
}