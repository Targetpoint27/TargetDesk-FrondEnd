import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap, catchError, of, finalize } from 'rxjs';
import { ToastService } from '../../../../core/services/toast.service';

import { 
  Call, 
  CreateCallRequest, 
  UpdateCallRequest, 
  ChangeStatusRequest, 
  CloseCallRequest, 
  CallNote,
  StoreMissedCallRequest,
  ScheduleCallbackRequest,
  CallbackResultRequest
} from '../../../../domain/models/call.model';

import { 
  GetMyQueueUseCase, 
  CreateCallUseCase, 
  GetCallDetailsUseCase, 
  UpdateCallUseCase, 
  ChangeCallStatusUseCase, 
  CloseCallUseCase, 
  GetCallbacksUseCase,
  GetDepartmentQueueUseCase,
  AssignToMeUseCase,
  StoreMissedCallUseCase,
  ScheduleCallbackUseCase,
  RecordCallbackResultUseCase
} from '../../../../domain/use-cases/call';

import { ComplaintHttpService } from '../../../../infrastructure/http/complaint-http.service';
import { StoreComplaintRequest } from '../../../../domain/models/complaint.model';
import { MessageService } from '../../../../shared/services/message.service';
import { AddCallNoteUseCase, AddCallNoteRequest } from '../../../../domain/use-cases/call/add-call-note.use-case';
import { SearchCallsUseCase } from '../../../../domain/use-cases/call/search-calls.use-case';
import { FilterCallsUseCase } from '../../../../domain/use-cases/call/filter-calls.use-case';
import { CallRepository } from '../../../../domain/repositories/call.repository';

@Injectable({
  providedIn: 'root'
})
export class CallFacade {
  // State management
  private myQueueSubject = new BehaviorSubject<Call[]>([]);
  private departmentQueueSubject = new BehaviorSubject<Call[]>([]);
  private callbacksSubject = new BehaviorSubject<Call[]>([]);
  private overdueCountSubject = new BehaviorSubject<number>(0);
  private currentCallSubject = new BehaviorSubject<Call | null>(null);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  private isCreatingSubject = new BehaviorSubject<boolean>(false);
  private isUpdatingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);
  private clientHistorySubject = new BehaviorSubject<Call[]>([]);


  // Observables for UI components
  myQueue$ = this.myQueueSubject.asObservable();
  departmentQueue$ = this.departmentQueueSubject.asObservable();
  callbacks$ = this.callbacksSubject.asObservable();
  overdueCount$ = this.overdueCountSubject.asObservable();
  currentCall$ = this.currentCallSubject.asObservable();
  isLoading$ = this.isLoadingSubject.asObservable();
  isCreating$ = this.isCreatingSubject.asObservable();
  isUpdating$ = this.isUpdatingSubject.asObservable();
  error$ = this.errorSubject.asObservable();
  clientHistory$ = this.clientHistorySubject.asObservable();

  constructor(
    private getMyQueueUseCase: GetMyQueueUseCase,
    private getDepartmentQueueUseCase: GetDepartmentQueueUseCase,
    private createCallUseCase: CreateCallUseCase,
    private getCallDetailsUseCase: GetCallDetailsUseCase,
    private updateCallUseCase: UpdateCallUseCase,
    private changeCallStatusUseCase: ChangeCallStatusUseCase,
    private closeCallUseCase: CloseCallUseCase,
    private callRepository: CallRepository,
    private getCallbacksUseCase: GetCallbacksUseCase,
    private addCallNoteUseCase: AddCallNoteUseCase,
    private assignToMeUseCase: AssignToMeUseCase,
    private storeMissedCallUseCase: StoreMissedCallUseCase,
    private scheduleCallbackUseCase: ScheduleCallbackUseCase,
    private recordCallbackResultUseCase: RecordCallbackResultUseCase,
    private messageService: MessageService,
    private searchCallsUseCase: SearchCallsUseCase,
    private filterCallsUseCase: FilterCallsUseCase,
    private complaintService: ComplaintHttpService,
    private toastService: ToastService
  ) {}

  // ===== CALLBACK OPERATIONS (SESSION 9) =====

  /**
   * US-CC-018: Loads all scheduled callbacks and updates the overdue counter [cite: 38, 58]
   */
  loadCallbacks(): Observable<any> {
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);

    return this.getCallbacksUseCase.execute().pipe(
      tap(result => {
        this.callbacksSubject.next(result.calls); // result.calls from repo mapping 
        this.overdueCountSubject.next(result.overdueCount); // result.overdue_count 
        this.isLoadingSubject.next(false);
      }),
      catchError(() => {
        this.isLoadingSubject.next(false);
        this.messageService.showError('Erreur lors du chargement des rappels');
        return of({ calls: [], overdueCount: 0 });
      })
    );
  }

  /**
   * US-CC-017: Registers a missed call via the dedicated endpoint [cite: 99, 108]
   */
  registerMissedCall(request: StoreMissedCallRequest): Observable<Call | null> {
    this.isCreatingSubject.next(true);
    this.errorSubject.next(null);

    return this.storeMissedCallUseCase.execute(request).pipe(
      tap(() => {
        this.isCreatingSubject.next(false);
        this.messageService.showSuccess('Appel manqué enregistré avec succès');
        this.loadCallbacks().subscribe(); // Refresh list to show new callback entry
      }),
      catchError(error => {
        this.isCreatingSubject.next(false);
        const msg = error.userMessage || 'Erreur lors de l\'enregistrement de l\'appel manqué';
        this.messageService.showError(msg);
        return of(null);
      })
    );
  }

  /**
   * US-CC-019: Updates an existing call to 'a_rappeler' status with a specific date/time [cite: 21, 32]
   */
  scheduleCall(callId: number, request: ScheduleCallbackRequest): Observable<Call | null> {
    this.isUpdatingSubject.next(true);
    this.errorSubject.next(null);

    return this.scheduleCallbackUseCase.execute(callId, request).pipe(
      tap((call) => {
        this.isUpdatingSubject.next(false);
        this.messageService.showSuccess('Rappel programmé avec succès');
        
        // Sync detailed view if open
        if (this.currentCallSubject.value?.id === callId) {
          this.currentCallSubject.next(call);
        }
        this.loadCallbacks().subscribe();
      }),
      catchError(error => {
        this.isUpdatingSubject.next(false);
        const msg = error.userMessage || 'Erreur lors de la programmation du rappel';
        this.messageService.showError(msg);
        return of(null);
      })
    );
  }

  /**
   * US-CC-020: Records callback result. If 'contacte', status moves to 'en_cours' [cite: 1, 16]
   */
  processCallbackResult(callId: number, request: CallbackResultRequest): Observable<Call | null> {
    this.isUpdatingSubject.next(true);
    this.errorSubject.next(null);

    return this.recordCallbackResultUseCase.execute(callId, request).pipe(
      tap((call) => {
        this.isUpdatingSubject.next(false);
        this.messageService.showSuccess('Résultat du rappel enregistré');
        
        // Sync local subjects
        if (this.currentCallSubject.value?.id === callId) {
          this.currentCallSubject.next(call);
        }
        
        // Comprehensive refresh: moves from callback list to personal queue 
        this.loadMyQueue().subscribe();
        this.loadCallbacks().subscribe();
      }),
      catchError(error => {
        this.isUpdatingSubject.next(false);
        const msg = error.userMessage || 'Erreur lors de l\'enregistrement du résultat';
        this.messageService.showError(msg);
        return of(null);
      })
    );
  }

  // ===== CORE OPERATIONS =====

  loadMyQueue(): Observable<Call[]> {
    this.isLoadingSubject.next(true);
    return this.getMyQueueUseCase.execute().pipe(
      tap(calls => {
        this.myQueueSubject.next(calls);
        this.isLoadingSubject.next(false);
      }),
      catchError(() => {
        this.isLoadingSubject.next(false);
        return of([]);
      })
    );
  }

  loadDepartmentQueue(): Observable<Call[]> {
    this.isLoadingSubject.next(true);
    return this.getDepartmentQueueUseCase.execute().pipe(
      tap(calls => {
        this.departmentQueueSubject.next(calls);
        this.isLoadingSubject.next(false);
      }),
      catchError(() => {
        this.isLoadingSubject.next(false);
        return of([]);
      })
    );
  }

  loadCallDetails(id: number): Observable<Call | null> {
    this.isLoadingSubject.next(true);
    return this.getCallDetailsUseCase.execute(id).pipe(
      tap(call => {
        this.currentCallSubject.next(call);
        this.isLoadingSubject.next(false);
      }),
      catchError(() => {
        this.isLoadingSubject.next(false);
        return of(null);
      })
    );
  }

  assignCallToMe(callId: number): Observable<Call | null> {
    this.isUpdatingSubject.next(true);
    return this.assignToMeUseCase.execute(callId).pipe(
      tap((call) => {
        this.isUpdatingSubject.next(false);
        this.messageService.showSuccess('Appel assigné avec succès');
        
        if (this.currentCallSubject.value?.id === callId) {
          this.currentCallSubject.next(call);
        }
        
        this.loadMyQueue().subscribe();
        this.loadDepartmentQueue().subscribe();
      }),
      catchError(error => {
        this.isUpdatingSubject.next(false);
        this.messageService.showError(error.userMessage || 'Erreur d\'assignation');
        return of(null);
      })
    );
  }

  createCall(request: CreateCallRequest): Observable<Call | null> {
    this.isCreatingSubject.next(true);
    return this.createCallUseCase.execute(request).pipe(
      tap(() => {
        this.isCreatingSubject.next(false);
        this.messageService.showSuccess('Appel créé avec succès');
        this.loadMyQueue().subscribe();
      }),
      catchError(error => {
        this.isCreatingSubject.next(false);
        this.messageService.showError(error.message || 'Erreur de création');
        return of(null);
      })
    );
  }

  updateCall(id: number, request: UpdateCallRequest): Observable<Call | null> {
    this.isUpdatingSubject.next(true);
    return this.updateCallUseCase.execute(id, request).pipe(
      tap(call => {
        this.isUpdatingSubject.next(false);
        this.messageService.showSuccess('Appel mis à jour');
        if (this.currentCallSubject.value?.id === id) this.currentCallSubject.next(call);
        this.loadMyQueue().subscribe();
      }),
      catchError(() => {
        this.isUpdatingSubject.next(false);
        return of(null);
      })
    );
  }

  changeCallStatus(id: number, request: ChangeStatusRequest): Observable<Call | null> {
    this.isUpdatingSubject.next(true);
    return this.changeCallStatusUseCase.execute(id, request).pipe(
      tap(call => {
        this.isUpdatingSubject.next(false);
        this.messageService.showSuccess('Statut mis à jour');
        if (this.currentCallSubject.value?.id === id) this.currentCallSubject.next(call);
        this.loadMyQueue().subscribe();
      }),
      catchError(() => {
        this.isUpdatingSubject.next(false);
        return of(null);
      })
    );
  }

  closeCall(id: number, request: CloseCallRequest): Observable<Call | null> {
    this.isUpdatingSubject.next(true);
    return this.closeCallUseCase.execute(id, request).pipe(
      tap(call => {
        this.isUpdatingSubject.next(false);
        this.messageService.showSuccess('Appel clôturé');
        if (this.currentCallSubject.value?.id === id) this.currentCallSubject.next(call);
        this.loadMyQueue().subscribe();
      }),
      catchError(() => {
        this.isUpdatingSubject.next(false);
        return of(null);
      })
    );
  }

  addNote(callId: number, request: AddCallNoteRequest): Observable<CallNote | null> {
    this.isUpdatingSubject.next(true);
    return this.addCallNoteUseCase.execute(callId, request).pipe(
      tap(() => {
        this.isUpdatingSubject.next(false);
        this.messageService.showSuccess('Note ajoutée');
        this.loadCallDetails(callId).subscribe();
      }),
      catchError(() => {
        this.isUpdatingSubject.next(false);
        return of(null);
      })
    );
  }

  // ===== SEARCH & FILTER =====

  searchCalls(query: string): Observable<Call[]> {
    return this.searchCallsUseCase.execute(query);
  }

  filterCalls(filters: any): Observable<any> {
    return this.filterCallsUseCase.execute(filters);
  }

  private setLoading(value: boolean): void {
    this.isLoadingSubject.next(value);
  }

  convertToComplaint(request: StoreComplaintRequest): Observable<any> {
    this.setLoading(true);
    return this.complaintService.create(request).pipe(
      tap(() => {
        this.toastService.success('Réclamation enregistrée avec succès. SLA calculé.');
        this.loadCallDetails(request.call_id).subscribe();
      }),
      finalize(() => this.setLoading(false))
    );
  }

  linkCallToClient(callId: number, clientId: number): void {
    this.isLoadingSubject.next(true);
    
    // Use the directly injected repository instead of the hack
    this.callRepository.linkClient(callId, clientId).subscribe({
      next: (updatedCall: Call) => {
        this.currentCallSubject.next(updatedCall); 
        this.toastService.success('Client associé avec succès');
        this.isLoadingSubject.next(false);
      },
      error: (err: any) => {
        this.toastService.error('Erreur lors de la liaison du client');
        this.isLoadingSubject.next(false);
      }
    });
  }

  loadClientHistory(clientId: number): void {
    // Use existing filter logic to get calls for this client_id
    this.filterCalls({ client_id: clientId }).subscribe(response => {
      const history = response.data?.calls?.slice(0, 5) || [];
      this.clientHistorySubject.next(history);
    });
  }

  // ===== UTILITY =====

  clearError(): void { this.errorSubject.next(null); }
  clearCurrentCall(): void { this.currentCallSubject.next(null); }
  getCurrentQueue(): Call[] { return this.myQueueSubject.getValue(); }
  getCurrentCall(): Call | null { return this.currentCallSubject.getValue(); }
}