import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap, catchError, of, map } from 'rxjs';

import { Call, CreateCallRequest, UpdateCallRequest, ChangeStatusRequest, CloseCallRequest, CallNote } from '../../../../domain/models/call.model';
import { 
  GetMyQueueUseCase, 
  CreateCallUseCase, 
  GetCallDetailsUseCase, 
  UpdateCallUseCase, 
  ChangeCallStatusUseCase, 
  CloseCallUseCase, 
  GetCallbacksUseCase,
  GetDepartmentQueueUseCase,
  AssignToMeUseCase 
} from '../../../../domain/use-cases/call';
import { MessageService } from '../../../../shared/services/message.service';
import { AddCallNoteUseCase, AddCallNoteRequest } from '../../../../domain/use-cases/call/add-call-note.use-case';
import { SearchCallsUseCase } from '../../../../domain/use-cases/call/search-calls.use-case';
import { FilterCallsUseCase } from '../../../../domain/use-cases/call/filter-calls.use-case';

@Injectable({
  providedIn: 'root'
})
export class CallFacade {
  private myQueueSubject = new BehaviorSubject<Call[]>([]);
  private departmentQueueSubject = new BehaviorSubject<Call[]>([]);
  private callbacksSubject = new BehaviorSubject<Call[]>([]);
  private currentCallSubject = new BehaviorSubject<Call | null>(null);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  private isCreatingSubject = new BehaviorSubject<boolean>(false);
  private isUpdatingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);

  myQueue$ = this.myQueueSubject.asObservable();
  departmentQueue$ = this.departmentQueueSubject.asObservable();
  callbacks$ = this.callbacksSubject.asObservable();
  currentCall$ = this.currentCallSubject.asObservable();
  isLoading$ = this.isLoadingSubject.asObservable();
  isCreating$ = this.isCreatingSubject.asObservable();
  isUpdating$ = this.isUpdatingSubject.asObservable();
  error$ = this.errorSubject.asObservable();

  constructor(
    private getMyQueueUseCase: GetMyQueueUseCase,
    private getDepartmentQueueUseCase: GetDepartmentQueueUseCase,
    private createCallUseCase: CreateCallUseCase,
    private getCallDetailsUseCase: GetCallDetailsUseCase,
    private updateCallUseCase: UpdateCallUseCase,
    private changeCallStatusUseCase: ChangeCallStatusUseCase,
    private closeCallUseCase: CloseCallUseCase,
    private getCallbacksUseCase: GetCallbacksUseCase,
    private addCallNoteUseCase: AddCallNoteUseCase,
    private assignToMeUseCase: AssignToMeUseCase,
    private messageService: MessageService,
    private searchCallsUseCase: SearchCallsUseCase,
    private filterCallsUseCase: FilterCallsUseCase,
  ) {}

  loadMyQueue(): Observable<Call[]> {
    this.isLoadingSubject.next(true);
    return this.getMyQueueUseCase.execute().pipe(
      tap(calls => {
        this.myQueueSubject.next(calls);
        this.isLoadingSubject.next(false);
      }),
      catchError(() => {
        this.isLoadingSubject.next(false);
        this.messageService.showError('Erreur chargement file personnelle');
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
        this.messageService.showError('Erreur chargement file département');
        return of([]);
      })
    );
  }

  assignCallToMe(callId: number): Observable<Call | null> {
    this.isUpdatingSubject.next(true);
    return this.assignToMeUseCase.execute(callId).pipe(
      tap(() => {
        this.isUpdatingSubject.next(false);
        this.messageService.showSuccess('Appel assigné avec succès');
        this.loadMyQueue().subscribe();
        this.loadDepartmentQueue().subscribe();
        if (this.currentCallSubject.value?.id === callId) {
          this.loadCallDetails(callId).subscribe();
        }
      }),
      catchError(error => {
        this.isUpdatingSubject.next(false);
        const msg = error.userMessage || 'Erreur lors de l\'assignation';
        this.messageService.showError(msg);
        return of(null);
      })
    );
  }

  loadCallbacks(): Observable<Call[]> {
    this.isLoadingSubject.next(true);
    return this.getCallbacksUseCase.execute().pipe(
      tap(calls => {
        this.callbacksSubject.next(calls);
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
        this.messageService.showError(error.message || 'Erreur création');
        return of(null);
      })
    );
  }

  updateCall(id: number, request: UpdateCallRequest): Observable<Call | null> {
    this.isUpdatingSubject.next(true);
    return this.updateCallUseCase.execute(id, request).pipe(
      tap(call => {
        this.isUpdatingSubject.next(false);
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
        this.loadCallDetails(callId).subscribe();
      }),
      catchError(() => {
        this.isUpdatingSubject.next(false);
        return of(null);
      })
    );
  }

  searchCalls(query: string): Observable<Call[]> {
    return this.searchCallsUseCase.execute(query);
  }

  filterCalls(filters: any): Observable<any> {
    return this.filterCallsUseCase.execute(filters);
  }

  clearError(): void { this.errorSubject.next(null); }
  clearCurrentCall(): void { this.currentCallSubject.next(null); }
}