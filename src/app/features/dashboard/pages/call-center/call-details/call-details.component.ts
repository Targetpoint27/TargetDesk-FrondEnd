import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Observable, Subject, takeUntil } from 'rxjs';

import { Call } from '../../../../../domain/models/call.model';
import { CallFacade } from '../../../call-center/calls/call.facade';

@Component({
  selector: 'app-call-details',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './call-details.component.html',
  styleUrl: './call-details.component.scss'
})
export class CallDetailsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  call$!: Observable<Call | null>;
  isLoading$!: Observable<boolean>;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private callFacade: CallFacade
  ) {
    this.call$ = this.callFacade.currentCall$;
    this.isLoading$ = this.callFacade.isLoading$;
  }

  ngOnInit(): void {
    const callId = Number(this.route.snapshot.params['id']);
    this.callFacade.loadCallDetails(callId).subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.callFacade.clearCurrentCall();
  }

  goBack(): void {
    this.router.navigate(['/dashboard/call-center/dashboard']);
  }

  getStatusClass(status: string): string {
    const classes: any = {
      'a_traiter': 'bg-yellow-100 text-yellow-800',
      'en_cours': 'bg-blue-100 text-blue-800',
      'cloture': 'bg-gray-100 text-gray-800',
      'a_rappeler': 'bg-red-100 text-red-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  }

  getUrgencyClass(urgency: string): string {
    const classes: any = {
      'critique': 'bg-red-100 text-red-800',
      'urgent': 'bg-orange-100 text-orange-800',
      'normal': 'bg-blue-100 text-blue-800'
    };
    return classes[urgency] || 'bg-blue-100 text-blue-800';
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}