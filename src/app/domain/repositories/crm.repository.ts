import { Observable } from 'rxjs';
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
} from '../models/crm.models';

/**
 * Repository abstrait pour la gestion CRM
 * Définit les contrats pour les opérations sur les notes, appels, rendez-vous et timeline
 */
export abstract class CrmRepository {

  // ==================== NOTES ====================

  /**
   * Récupère les notes d'un client avec filtres et pagination
   */
  abstract getClientNotes(clientId: number, filters?: NoteFilters): Observable<NotesResponse>;

  /**
   * Crée une nouvelle note pour un client
   */
  abstract createNote(clientId: number, request: CreateNoteRequest): Observable<ClientNote>;

  /**
   * Récupère une note spécifique par son ID
   */
  abstract getNote(noteId: number): Observable<ClientNote>;

  /**
   * Met à jour une note existante
   */
  abstract updateNote(noteId: number, request: UpdateNoteRequest): Observable<ClientNote>;

  /**
   * Supprime une note
   */
  abstract deleteNote(noteId: number): Observable<void>;

  /**
   * Épingle/Désépingle une note
   */
  abstract togglePinNote(noteId: number): Observable<ClientNote>;

  /**
   * Ajoute une pièce jointe à une note
   */
  abstract addNoteAttachment(noteId: number, request: UploadAttachmentRequest): Observable<NoteAttachment>;

  /**
   * Supprime une pièce jointe
   */
  abstract deleteNoteAttachment(attachmentId: number): Observable<void>;

  // ==================== APPELS ====================

  /**
   * Récupère les appels d'un client avec filtres et pagination
   */
  abstract getClientCalls(clientId: number, filters?: CallFilters): Observable<CallsResponse>;

  /**
   * Enregistre un nouvel appel pour un client
   */
  abstract createCall(clientId: number, request: CreateCallRequest): Observable<ClientCall>;

  /**
   * Récupère un appel spécifique par son ID
   */
  abstract getCall(callId: number): Observable<ClientCall>;

  /**
   * Met à jour un appel existant
   */
  abstract updateCall(callId: number, request: UpdateCallRequest): Observable<ClientCall>;

  /**
   * Supprime un appel
   */
  abstract deleteCall(callId: number): Observable<void>;

  /**
   * Marque le suivi d'un appel comme terminé
   */
  abstract completeCallFollowUp(callId: number): Observable<ClientCall>;

  /**
   * Récupère les appels nécessitant un suivi (dashboard)
   */
  abstract getCallsFollowUps(): Observable<DashboardCallsResponse>;

  // ==================== RENDEZ-VOUS ====================

  /**
   * Récupère les rendez-vous d'un client avec filtres et pagination
   */
  abstract getClientAppointments(clientId: number, filters?: AppointmentFilters): Observable<AppointmentsResponse>;

  /**
   * Planifie un nouveau rendez-vous pour un client
   */
  abstract createAppointment(clientId: number, request: CreateAppointmentRequest): Observable<ClientAppointment>;

  /**
   * Récupère un rendez-vous spécifique par son ID
   */
  abstract getAppointment(appointmentId: number): Observable<ClientAppointment>;

  /**
   * Met à jour un rendez-vous existant
   */
  abstract updateAppointment(appointmentId: number, request: UpdateAppointmentRequest): Observable<ClientAppointment>;

  /**
   * Supprime un rendez-vous
   */
  abstract deleteAppointment(appointmentId: number): Observable<void>;

  /**
   * Change le statut d'un rendez-vous
   */
  abstract updateAppointmentStatus(appointmentId: number, request: UpdateAppointmentStatusRequest): Observable<ClientAppointment>;

  /**
   * Récupère les rendez-vous du jour (dashboard)
   */
  abstract getTodayAppointments(): Observable<DashboardAppointmentsResponse>;

  /**
   * Récupère les prochains rendez-vous (dashboard)
   */
  abstract getUpcomingAppointments(days?: number, limit?: number): Observable<DashboardAppointmentsResponse>;

  // ==================== TIMELINE ====================

  /**
   * Récupère la timeline chronologique d'un client
   */
  abstract getClientTimeline(clientId: number, filters?: TimelineFilters): Observable<TimelineResponse>;

  /**
   * Récupère les interactions récentes (dashboard)
   */
  abstract getRecentInteractions(days?: number, limit?: number): Observable<DashboardInteractionsResponse>;
}