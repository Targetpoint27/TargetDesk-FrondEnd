import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Observable, Subject, takeUntil } from 'rxjs';
import { CallFacade } from '../../../call-center/calls/call.facade';
import { Call } from '../../../../../domain/models/call.model';

@Component({
  selector: 'app-department-queue',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './department-queue.component.html',
  styleUrl: './department-queue.component.scss'
})
export class DepartmentQueueComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  calls$: Observable<Call[]>;
  isLoading$: Observable<boolean>;

  constructor(
    private callFacade: CallFacade,
    private router: Router
  ) {
    this.calls$ = this.callFacade.departmentQueue$;
    this.isLoading$ = this.callFacade.isLoading$;
  }

  ngOnInit(): void {
    this.callFacade.loadDepartmentQueue().subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onRefresh(): void {
    this.callFacade.loadDepartmentQueue().subscribe();
  }

  onAssign(callId: number, event: Event): void {
    event.stopPropagation();
    this.callFacade.assignCallToMe(callId).subscribe();
  }

  viewCall(callId: number): void {
    this.router.navigate(['/dashboard/call-center/calls', callId]);
  }

  getStatusClass(status: string): string {
    const map: any = {
      'a_traiter': 'bg-yellow-100 text-yellow-800',
      'en_cours': 'bg-blue-100 text-blue-800',
      'a_rappeler': 'bg-red-100 text-red-800'
    };
    return map[status] || 'bg-gray-100 text-gray-800';
  }

  getUrgencyClass(urgency: string): string {
    const map: any = {
      'critique': 'bg-red-500',
      'urgent': 'bg-orange-500',
      'normal': 'bg-blue-500'
    };
    return map[urgency] || 'bg-gray-500';
  }
}