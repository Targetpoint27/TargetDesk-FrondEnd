/**
 * Call Facade
 * Manages call center state and operations
 * Follows the same pattern as CategoryFacade
 */

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap, catchError, of, map } from 'rxjs';

import { Call, CreateCallRequest, UpdateCallRequest, ChangeStatusRequest, CloseCallRequest } from '../../../../domain/models/call.model';
import { GetMyQueueUseCase } from '../../../../domain/use-cases/call/get-my-queue.use-case';
import { CreateCallUseCase } from '../../../../domain/use-cases/call/create-call.use-case';
import { GetCallDetailsUseCase } from '../../../../domain/use-cases/call/get-call-details.use-case';
import { UpdateCallUseCase } from '../../../../domain/use-cases/call/update-call.use-case';
import { ChangeCallStatusUseCase } from '../../../../domain/use-cases/call/change-call-status.use-case';
import { CloseCallUseCase } from '../../../../domain/use-cases/call/close-call.use-case';
import { GetCallbacksUseCase } from '../../../../domain/use-cases/call/get-callbacks.use-case';
import { MessageService } from '../../../../shared/services/message.service';
import { AddCallNoteUseCase, AddCallNoteRequest } from '../../../../domain/use-cases/call/add-call-note.use-case';
import { CallNote } from '../../../../domain/models/call.model';

@Injectable({
  providedIn: 'root'
})
export class CallFacade {
  // State subjects
  private myQueueSubject = new BehaviorSubject<Call[]>([]);
  private callbacksSubject = new BehaviorSubject<Call[]>([]);
  private currentCallSubject = new BehaviorSubject<Call | null>(null);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  private isCreatingSubject = new BehaviorSubject<boolean>(false);
  private isUpdatingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);

  // Public observables
  myQueue$ = this.myQueueSubject.asObservable();
  callbacks$ = this.callbacksSubject.asObservable();
  currentCall$ = this.currentCallSubject.asObservable();
  isLoading$ = this.isLoadingSubject.asObservable();
  isCreating$ = this.isCreatingSubject.asObservable();
  isUpdating$ = this.isUpdatingSubject.asObservable();
  error$ = this.errorSubject.asObservable();

  constructor(
    private getMyQueueUseCase: GetMyQueueUseCase,
    private createCallUseCase: CreateCallUseCase,
    private getCallDetailsUseCase: GetCallDetailsUseCase,
    private updateCallUseCase: UpdateCallUseCase,
    private changeCallStatusUseCase: ChangeCallStatusUseCase,
    private closeCallUseCase: CloseCallUseCase,
    private getCallbacksUseCase: GetCallbacksUseCase,
    private addCallNoteUseCase: AddCallNoteUseCase,
    private messageService: MessageService
  ) {}

  // ===== LOAD OPERATIONS =====

  /**
   * Load my queue calls
   */
  loadMyQueue(): Observable<Call[]> {
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);

    return this.getMyQueueUseCase.execute().pipe(
      tap(calls => {
        console.log('My queue loaded:', calls.length);
        this.myQueueSubject.next(calls);
        this.isLoadingSubject.next(false);
      }),
      catchError(error => {
        console.error('Error loading my queue:', error);
        this.isLoadingSubject.next(false);
        this.errorSubject.next('Erreur lors du chargement de votre file d\'attente');
        this.messageService.showError('Erreur lors du chargement de votre file d\'attente');
        return of([]);
      })
    );
  }

  /**
   * Load callbacks
   */
  loadCallbacks(): Observable<Call[]> {
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);

    return this.getCallbacksUseCase.execute().pipe(
      tap(calls => {
        console.log('Callbacks loaded:', calls.length);
        this.callbacksSubject.next(calls);
        this.isLoadingSubject.next(false);
      }),
      catchError(error => {
        console.error('Error loading callbacks:', error);
        this.isLoadingSubject.next(false);
        this.errorSubject.next('Erreur lors du chargement des rappels');
        this.messageService.showError('Erreur lors du chargement des rappels');
        return of([]);
      })
    );
  }

  /**
   * Load call details
   */
  loadCallDetails(id: number): Observable<Call | null> {
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);

    return this.getCallDetailsUseCase.execute(id).pipe(
      tap(call => {
        console.log('Call details loaded:', call?.call_id);
        this.currentCallSubject.next(call);
        this.isLoadingSubject.next(false);
      }),
      catchError(error => {
        console.error('Error loading call details:', error);
        this.isLoadingSubject.next(false);
        this.errorSubject.next('Erreur lors du chargement des détails de l\'appel');
        this.messageService.showError('Erreur lors du chargement des détails de l\'appel');
        return of(null);
      })
    );
  }

  // ===== CREATE OPERATION =====

  /**
   * Create a new call
   */
  createCall(request: CreateCallRequest): Observable<Call | null> {
    this.isCreatingSubject.next(true);
    this.errorSubject.next(null);

    return this.createCallUseCase.execute(request).pipe(
      tap(call => {
        this.isCreatingSubject.next(false);
        this.messageService.showSuccess('Appel créé avec succès');
        // Reload my queue to include new call
        this.loadMyQueue().subscribe();
      }),
      catchError(error => {
        console.error('Error creating call:', error);
        this.isCreatingSubject.next(false);

        const errorMessage = error.userMessage || error.message || 'Erreur lors de la création de l\'appel';
        this.errorSubject.next(errorMessage);
        this.messageService.showError(errorMessage);
        return of(null);
      })
    );
  }

  // ===== UPDATE OPERATIONS =====

  /**
   * Update call
   */
  updateCall(id: number, request: UpdateCallRequest): Observable<Call | null> {
    this.isUpdatingSubject.next(true);
    this.errorSubject.next(null);

    return this.updateCallUseCase.execute(id, request).pipe(
      tap(call => {
        this.isUpdatingSubject.next(false);
        this.messageService.showSuccess('Appel modifié avec succès');
        // Update current call if it's the one being edited
        if (this.currentCallSubject.value?.id === id) {
          this.currentCallSubject.next(call);
        }
        // Reload queue
        this.loadMyQueue().subscribe();
      }),
      catchError(error => {
        console.error('Error updating call:', error);
        this.isUpdatingSubject.next(false);

        const errorMessage = error.userMessage || error.message || 'Erreur lors de la modification de l\'appel';
        this.errorSubject.next(errorMessage);
        this.messageService.showError(errorMessage);
        return of(null);
      })
    );
  }

  /**
   * Change call status
   */
  changeCallStatus(id: number, request: ChangeStatusRequest): Observable<Call | null> {
    this.isUpdatingSubject.next(true);
    this.errorSubject.next(null);

    return this.changeCallStatusUseCase.execute(id, request).pipe(
      tap(call => {
        this.isUpdatingSubject.next(false);
        this.messageService.showSuccess('Statut modifié avec succès');
        // Update current call
        if (this.currentCallSubject.value?.id === id) {
          this.currentCallSubject.next(call);
        }
        // Reload queue
        this.loadMyQueue().subscribe();
      }),
      catchError(error => {
        console.error('Error changing status:', error);
        this.isUpdatingSubject.next(false);

        const errorMessage = error.userMessage || error.message || 'Erreur lors du changement de statut';
        this.errorSubject.next(errorMessage);
        this.messageService.showError(errorMessage);
        return of(null);
      })
    );
  }

  /**
   * Close call
   */
  closeCall(id: number, request: CloseCallRequest): Observable<Call | null> {
    this.isUpdatingSubject.next(true);
    this.errorSubject.next(null);

    return this.closeCallUseCase.execute(id, request).pipe(
      tap(call => {
        this.isUpdatingSubject.next(false);
        this.messageService.showSuccess('Appel clôturé avec succès');
        // Update current call
        if (this.currentCallSubject.value?.id === id) {
          this.currentCallSubject.next(call);
        }
        // Reload queue
        this.loadMyQueue().subscribe();
      }),
      catchError(error => {
        console.error('Error closing call:', error);
        this.isUpdatingSubject.next(false);

        const errorMessage = error.userMessage || error.message || 'Erreur lors de la clôture de l\'appel';
        this.errorSubject.next(errorMessage);
        this.messageService.showError(errorMessage);
        return of(null);
      })
    );
  }

  /**
   * Add note to call
   */
  addNote(callId: number, request: AddCallNoteRequest): Observable<CallNote | null> {
    this.isUpdatingSubject.next(true);
    this.errorSubject.next(null);

    return this.addCallNoteUseCase.execute(callId, request).pipe(
      tap(note => {
        this.isUpdatingSubject.next(false);
        this.messageService.showSuccess('Note ajoutée avec succès');
        // Reload call details to show new note
        this.loadCallDetails(callId).subscribe();
      }),
      catchError(error => {
        console.error('Error adding note:', error);
        this.isUpdatingSubject.next(false);

        const errorMessage = error.userMessage || error.message || 'Erreur lors de l\'ajout de la note';
        this.errorSubject.next(errorMessage);
        this.messageService.showError(errorMessage);
        return of(null);
      })
    );
  }

  // ===== UTILITY METHODS =====

  /**
   * Clear error
   */
  clearError(): void {
    this.errorSubject.next(null);
  }

  /**
   * Clear current call
   */
  clearCurrentCall(): void {
    this.currentCallSubject.next(null);
  }

  /**
   * Get current queue
   */
  getCurrentQueue(): Call[] {
    return this.myQueueSubject.getValue();
  }

  /**
   * Get current call
   */
  getCurrentCall(): Call | null {
    return this.currentCallSubject.getValue();
  }

  /**
   * Get queue count
   */
  getQueueCount(): number {
    return this.myQueueSubject.getValue().length;
  }

  /**
   * Get callbacks count
   */
  getCallbacksCount(): number {
    return this.callbacksSubject.getValue().length;
  }
}