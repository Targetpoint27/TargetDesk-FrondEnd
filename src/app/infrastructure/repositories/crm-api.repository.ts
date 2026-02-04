import { Injectable } from '@angular/core';
import { Observable, catchError, throwError, map } from 'rxjs';
import { HttpParams, HttpErrorResponse } from '@angular/common/http';

import { CrmRepository } from '../../domain/repositories/crm.repository';
import {
  // Notes
  ClientNote,
  CreateNoteRequest,
  UpdateNoteRequest,
  NoteFilters,
  NotesResponse,
  NoteAttachment,
  UploadAttachmentRequest,

  // Appels
  ClientCall,
  CreateCallRequest,
  UpdateCallRequest,
  CallFilters,
  CallsResponse,
  DashboardCallsResponse,

  // Rendez-vous
  ClientAppointment,
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
  UpdateAppointmentStatusRequest,
  AppointmentFilters,
  AppointmentsResponse,
  DashboardAppointmentsResponse,

  // Timeline
  TimelineItem,
  TimelineFilters,
  TimelineResponse,
  DashboardInteractionsResponse
} from '../../domain/models/crm.models';

import { ApiService } from '../../core/api/api.service';
import { AppError } from '../../core/error/error.service';

@Injectable({
  providedIn: 'root'
})
export class CrmApiRepository extends CrmRepository {

  constructor(private apiService: ApiService) {
    super();
  }

  // ==================== NOTES ====================

  getClientNotes(clientId: number, filters?: NoteFilters): Observable<NotesResponse> {
    let params = new HttpParams();
    if (filters) {
      if (filters.type) params = params.set('type', filters.type);
      if (filters.pinned_only !== undefined) params = params.set('pinned_only', filters.pinned_only.toString());
      if (filters.per_page) params = params.set('per_page', filters.per_page.toString());
    }

    return this.apiService.get<{ data: NotesResponse }>(`clients/${clientId}/notes`, { params })
      .pipe(
        map(response => response.data),
        catchError(error => this.handleError(error, 'Erreur lors de la récupération des notes'))
      );
  }

  createNote(clientId: number, request: CreateNoteRequest): Observable<ClientNote> {
    return this.apiService.post<{ data: ClientNote }>(`clients/${clientId}/notes`, request)
      .pipe(
        map(response => response.data)
        // Supprimé catchError pour laisser l'ErrorService gérer les erreurs HTTP
      );
  }

  getNote(noteId: number): Observable<ClientNote> {
    return this.apiService.get<{ data: ClientNote }>(`notes/${noteId}`)
      .pipe(
        map(response => response.data),
        catchError(error => this.handleError(error, 'Erreur lors de la récupération de la note'))
      );
  }

  updateNote(noteId: number, request: UpdateNoteRequest): Observable<ClientNote> {
    return this.apiService.put<{ data: ClientNote }>(`notes/${noteId}`, request)
      .pipe(
        map(response => response.data)
        // Supprimé catchError pour laisser l'ErrorService gérer les erreurs HTTP
      );
  }

  deleteNote(noteId: number): Observable<void> {
    return this.apiService.delete<void>(`notes/${noteId}`)
      .pipe(
        // Supprimé catchError pour laisser l'ErrorService gérer les erreurs HTTP
      );
  }

  togglePinNote(noteId: number): Observable<ClientNote> {
    return this.apiService.post<{ data: ClientNote }>(`notes/${noteId}/pin`, {})
      .pipe(
        map(response => response.data),
        catchError(error => this.handleError(error, 'Erreur lors de l\'épinglage de la note'))
      );
  }

  addNoteAttachment(noteId: number, request: UploadAttachmentRequest): Observable<NoteAttachment> {
    const formData = new FormData();
    formData.append('file', request.file);
    if (request.description) {
      formData.append('description', request.description);
    }

    return this.apiService.post<{ data: NoteAttachment }>(`notes/${noteId}/attachments`, formData)
      .pipe(
        map(response => response.data),
        catchError(error => this.handleError(error, 'Erreur lors de l\'ajout de la pièce jointe'))
      );
  }

  deleteNoteAttachment(attachmentId: number): Observable<void> {
    return this.apiService.delete<void>(`notes/attachments/${attachmentId}`)
      .pipe(
        catchError(error => this.handleError(error, 'Erreur lors de la suppression de la pièce jointe'))
      );
  }

  // ==================== APPELS ====================

  getClientCalls(clientId: number, filters?: CallFilters): Observable<CallsResponse> {
    let params = new HttpParams();
    if (filters) {
      if (filters.type) params = params.set('type', filters.type);
      if (filters.outcome) params = params.set('outcome', filters.outcome);
      if (filters.follow_up_required !== undefined) params = params.set('follow_up_required', filters.follow_up_required.toString());
      if (filters.date_from) params = params.set('date_from', filters.date_from);
      if (filters.date_to) params = params.set('date_to', filters.date_to);
      if (filters.per_page) params = params.set('per_page', filters.per_page.toString());
    }

    return this.apiService.get<{ data: CallsResponse }>(`clients/${clientId}/calls`, { params })
      .pipe(
        map(response => response.data),
        catchError(error => this.handleError(error, 'Erreur lors de la récupération des appels'))
      );
  }

  createCall(clientId: number, request: CreateCallRequest): Observable<ClientCall> {
    return this.apiService.post<{ data: ClientCall }>(`clients/${clientId}/calls`, request)
      .pipe(
        map(response => response.data)
        // Supprimé catchError pour laisser l'ErrorService gérer les erreurs HTTP
      );
  }

  getCall(callId: number): Observable<ClientCall> {
    return this.apiService.get<{ data: ClientCall }>(`calls/${callId}`)
      .pipe(
        map(response => response.data),
        catchError(error => this.handleError(error, 'Erreur lors de la récupération de l\'appel'))
      );
  }

  updateCall(callId: number, request: UpdateCallRequest): Observable<ClientCall> {
    return this.apiService.put<{ data: ClientCall }>(`calls/${callId}`, request)
      .pipe(
        map(response => response.data)
        // Supprimé catchError pour laisser l'ErrorService gérer les erreurs HTTP
      );
  }

  deleteCall(callId: number): Observable<void> {
    return this.apiService.delete<void>(`calls/${callId}`)
      .pipe(
        // Supprimé catchError pour laisser l'ErrorService gérer les erreurs HTTP
      );
  }

  completeCallFollowUp(callId: number): Observable<ClientCall> {
    return this.apiService.put<{ data: ClientCall }>(`calls/${callId}/complete-follow-up`, {})
      .pipe(
        map(response => response.data),
        catchError(error => this.handleError(error, 'Erreur lors de la finalisation du suivi'))
      );
  }

  getCallsFollowUps(): Observable<DashboardCallsResponse> {
    return this.apiService.get<DashboardCallsResponse>('dashboard/calls/follow-ups')
      .pipe(
        catchError(error => this.handleError(error, 'Erreur lors de la récupération des suivis d\'appels'))
      );
  }

  // ==================== RENDEZ-VOUS ====================

  getClientAppointments(clientId: number, filters?: AppointmentFilters): Observable<AppointmentsResponse> {
    let params = new HttpParams();
    if (filters) {
      if (filters.status) params = params.set('status', filters.status);
      if (filters.date_from) params = params.set('date_from', filters.date_from);
      if (filters.date_to) params = params.set('date_to', filters.date_to);
      if (filters.per_page) params = params.set('per_page', filters.per_page.toString());
    }

    return this.apiService.get<{ data: AppointmentsResponse }>(`clients/${clientId}/appointments`, { params })
      .pipe(
        map(response => response.data),
        catchError(error => this.handleError(error, 'Erreur lors de la récupération des rendez-vous'))
      );
  }

  createAppointment(clientId: number, request: CreateAppointmentRequest): Observable<ClientAppointment> {
    return this.apiService.post<{ data: ClientAppointment }>(`clients/${clientId}/appointments`, request)
      .pipe(
        map(response => response.data)
        // Supprimé catchError pour laisser l'ErrorService gérer les erreurs HTTP
      );
  }

  getAppointment(appointmentId: number): Observable<ClientAppointment> {
    return this.apiService.get<{ data: ClientAppointment }>(`appointments/${appointmentId}`)
      .pipe(
        map(response => response.data),
        catchError(error => this.handleError(error, 'Erreur lors de la récupération du rendez-vous'))
      );
  }

  updateAppointment(appointmentId: number, request: UpdateAppointmentRequest): Observable<ClientAppointment> {
    return this.apiService.put<{ data: ClientAppointment }>(`appointments/${appointmentId}`, request)
      .pipe(
        map(response => response.data)
        // Supprimé catchError pour laisser l'ErrorService gérer les erreurs HTTP
      );
  }

  deleteAppointment(appointmentId: number): Observable<void> {
    return this.apiService.delete<void>(`appointments/${appointmentId}`)
      .pipe(
        // Supprimé catchError pour laisser l'ErrorService gérer les erreurs HTTP
      );
  }

  updateAppointmentStatus(appointmentId: number, request: UpdateAppointmentStatusRequest): Observable<ClientAppointment> {
    return this.apiService.put<{ data: ClientAppointment }>(`appointments/${appointmentId}/status`, request)
      .pipe(
        map(response => response.data),
        catchError(error => this.handleError(error, 'Erreur lors de la mise à jour du statut'))
      );
  }

  getTodayAppointments(): Observable<DashboardAppointmentsResponse> {
    return this.apiService.get<DashboardAppointmentsResponse>('dashboard/appointments/today')
      .pipe(
        catchError(error => this.handleError(error, 'Erreur lors de la récupération des rendez-vous du jour'))
      );
  }

  getUpcomingAppointments(days?: number, limit?: number): Observable<DashboardAppointmentsResponse> {
    let params = new HttpParams();
    if (days) params = params.set('days', days.toString());
    if (limit) params = params.set('limit', limit.toString());

    return this.apiService.get<DashboardAppointmentsResponse>('dashboard/appointments/upcoming', { params })
      .pipe(
        catchError(error => this.handleError(error, 'Erreur lors de la récupération des prochains rendez-vous'))
      );
  }

  // ==================== TIMELINE ====================

  getClientTimeline(clientId: number, filters?: TimelineFilters): Observable<TimelineResponse> {
    let params = new HttpParams();
    if (filters) {
      if (filters.type) params = params.set('type', filters.type);
      if (filters.user_id) params = params.set('user_id', filters.user_id.toString());
      if (filters.date_from) params = params.set('date_from', filters.date_from);
      if (filters.date_to) params = params.set('date_to', filters.date_to);
      if (filters.per_page) params = params.set('per_page', filters.per_page.toString());
    }

    return this.apiService.get<{ data: TimelineResponse }>(`clients/${clientId}/timeline`, { params })
      .pipe(
        map(response => response.data),
        catchError(error => this.handleError(error, 'Erreur lors de la récupération de la timeline'))
      );
  }

  getRecentInteractions(days?: number, limit?: number): Observable<DashboardInteractionsResponse> {
    let params = new HttpParams();
    if (days) params = params.set('days', days.toString());
    if (limit) params = params.set('limit', limit.toString());

    return this.apiService.get<DashboardInteractionsResponse>('dashboard/interactions', { params })
      .pipe(
        catchError(error => this.handleError(error, 'Erreur lors de la récupération des interactions récentes'))
      );
  }

  // ==================== ERROR HANDLING ====================

  private handleError(error: any, defaultMessage: string): Observable<never> {
    console.error('CrmApiRepository Error:', error);

    if (error instanceof HttpErrorResponse) {
      if (error.status === 422 && error.error) {
        try {
          const errorData = typeof error.error === 'string' ? JSON.parse(error.error) : error.error;
          if (errorData.errors) {
            const message = Object.values(errorData.errors).flat().join(', ');
            return throwError(() => new AppError('VALIDATION_ERROR', message, message, errorData.errors));
          }
          return throwError(() => new AppError('VALIDATION_ERROR', errorData.message || defaultMessage, errorData.message || defaultMessage));
        } catch {
          return throwError(() => new AppError('VALIDATION_ERROR', defaultMessage, defaultMessage));
        }
      }

      if (error.status === 401) {
        return throwError(() => new AppError('UNAUTHORIZED', 'Session expirée, veuillez vous reconnecter', 'Session expirée, veuillez vous reconnecter'));
      }

      if (error.status === 403) {
        return throwError(() => new AppError('FORBIDDEN', 'Vous n\'avez pas les droits pour effectuer cette action', 'Vous n\'avez pas les droits pour effectuer cette action'));
      }

      if (error.status === 404) {
        return throwError(() => new AppError('NOT_FOUND', 'Ressource non trouvée', 'Ressource non trouvée'));
      }

      if (error.status >= 500) {
        return throwError(() => new AppError('SERVER_ERROR', 'Erreur serveur, veuillez réessayer plus tard', 'Erreur serveur, veuillez réessayer plus tard'));
      }
    }

    return throwError(() => new AppError('UNKNOWN_ERROR', defaultMessage, defaultMessage));
  }
}