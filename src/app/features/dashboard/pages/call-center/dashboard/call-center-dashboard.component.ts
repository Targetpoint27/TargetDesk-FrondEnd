/**
 * Call Center Dashboard Component
 * Main dashboard for call center agents
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable, Subject, takeUntil, combineLatest, map } from 'rxjs';

import { Call } from '../../../../../domain/models/call.model';
import { CallFacade } from '../../../call-center/calls/call.facade';

interface DashboardState {
  myQueueCalls: Call[];
  callbacksCalls: Call[];
  isLoading: boolean;
  error: string | null;
  stats: {
    totalInQueue: number;
    totalCallbacks: number;
    urgentCalls: number;
    newCalls: number;
  };
}

@Component({
  selector: 'app-call-center-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './call-center-dashboard.component.html',
  styleUrl: './call-center-dashboard.component.scss'
})
export class CallCenterDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // State observable
  state$: Observable<DashboardState>;

  constructor(private callFacade: CallFacade) {
    // Combine facade observables to create view state
    this.state$ = combineLatest([
      this.callFacade.myQueue$,
      this.callFacade.callbacks$,
      this.callFacade.isLoading$,
      this.callFacade.error$
    ]).pipe(
      takeUntil(this.destroy$),
      map(([myQueue, callbacks, isLoading, error]) => {
        // Calculate stats
        const stats = {
          totalInQueue: myQueue.length,
          totalCallbacks: callbacks.length,
          urgentCalls: myQueue.filter(call => 
            call.urgency === 'urgent' || call.urgency === 'critique'
          ).length,
          newCalls: myQueue.filter(call => call.status === 'nouveau').length
        };

        return {
          myQueueCalls: myQueue,
          callbacksCalls: callbacks,
          isLoading,
          error,
          stats
        };
      })
    );
  }

  ngOnInit(): void {
    // Load initial data
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Data loading
  loadDashboardData(): void {
    this.callFacade.loadMyQueue().subscribe();
    this.callFacade.loadCallbacks().subscribe();
  }

  // UI Actions
  refreshData(): void {
    this.loadDashboardData();
  }

  clearError(): void {
    this.callFacade.clearError();
  }

  // Utility methods for template
  getUrgencyClass(urgency: string): string {
    switch (urgency) {
      case 'critique':
        return 'bg-red-100 text-red-800';
      case 'urgent':
        return 'bg-orange-100 text-orange-800';
      case 'normal':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'nouveau':
        return 'bg-green-100 text-green-800';
      case 'a_traiter':
        return 'bg-yellow-100 text-yellow-800';
      case 'en_cours':
        return 'bg-blue-100 text-blue-800';
      case 'en_attente':
        return 'bg-orange-100 text-orange-800';
      case 'resolu':
        return 'bg-purple-100 text-purple-800';
      case 'cloture':
        return 'bg-gray-100 text-gray-800';
      case 'a_rappeler':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  formatStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'nouveau': 'Nouveau',
      'a_traiter': 'À traiter',
      'en_cours': 'En cours',
      'en_attente': 'En attente',
      'resolu': 'Résolu',
      'cloture': 'Clôturé',
      'a_rappeler': 'À rappeler'
    };
    return statusMap[status] || status;
  }

  formatUrgency(urgency: string): string {
    const urgencyMap: Record<string, string> = {
      'normal': 'Normal',
      'urgent': 'Urgent',
      'critique': 'Critique'
    };
    return urgencyMap[urgency] || urgency;
  }

  formatDate(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // Relative time for recent calls
    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins}min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    
    // Absolute date for older calls
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit'
    });
  }

  getCallDirectionClass(direction: string): string {
    switch (direction) {
      case 'entrant':
        return 'bg-gradient-to-br from-green-50 to-emerald-100/50 text-green-600';
      case 'sortant':
        return 'bg-gradient-to-br from-blue-50 to-indigo-100/50 text-blue-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  }

  getCallDirectionLabel(direction: string): string {
    switch (direction) {
      case 'entrant':
        return 'Entrant';
      case 'sortant':
        return 'Sortant';
      default:
        return 'Inconnu';
    }
  }
}