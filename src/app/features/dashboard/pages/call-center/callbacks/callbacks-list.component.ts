import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Observable, Subject, takeUntil } from 'rxjs';
import { CallFacade } from '../../../call-center/calls/call.facade';
import { Call } from '../../../../../domain/models/call.model';

@Component({
  selector: 'app-callbacks-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './callbacks-list.component.html',
  styleUrl: './callbacks-list.component.scss'
})
export class CallbacksListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  callbacks$: Observable<Call[]>;
  overdueCount$: Observable<number>;
  isLoading$: Observable<boolean>;

  constructor(
    private callFacade: CallFacade,
    private router: Router
  ) {
    this.callbacks$ = this.callFacade.callbacks$;
    this.overdueCount$ = this.callFacade.overdueCount$;
    this.isLoading$ = this.callFacade.isLoading$;
  }

  ngOnInit(): void {
    this.callFacade.loadCallbacks().subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onRefresh(): void {
    this.callFacade.loadCallbacks().subscribe();
  }

  viewCall(callId: number): void {
    this.router.navigate(['/dashboard/call-center/calls', callId]);
  }

  openResultModal(call: Call, event: Event): void {
    event.stopPropagation();
    // Logic for US-CC-020 result modal will go here
    console.log('Opening Result Modal for call:', call.id);
  }

  formatDate(date: any): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getUrgencyClass(urgency: string): string {
    const map: any = {
      'critique': 'bg-red-500 text-white shadow-lg shadow-red-100',
      'urgent': 'bg-orange-500 text-white shadow-lg shadow-orange-100',
      'normal': 'bg-blue-500 text-white shadow-lg shadow-blue-100'
    };
    return map[urgency] || 'bg-gray-500 text-white';
  }
}