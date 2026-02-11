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
    this.callFacade.loadCallbacks().pipe(takeUntil(this.destroy$)).subscribe();
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

  formatDate(date: any): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  getUrgencyClass(urgency: string): string {
    const map: any = {
      'critique': 'bg-red-50 text-red-600 border border-red-100',
      'urgent': 'bg-orange-50 text-orange-600 border border-orange-100',
      'normal': 'bg-blue-50 text-blue-600 border border-blue-100'
    };
    return map[urgency] || 'bg-gray-50 text-gray-600';
  }
}