import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { CrmRepository } from '../../repositories/crm.repository';
import {
  ClientAppointment,
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
  UpdateAppointmentStatusRequest,
  AppointmentFilters,
  AppointmentsResponse,
  DashboardAppointmentsResponse
} from '../../models/crm.models';

@Injectable({
  providedIn: 'root'
})
export class ManageAppointmentsUseCase {

  constructor(private crmRepository: CrmRepository) {}

  /**
   * Récupère les rendez-vous d'un client
   */
  getClientAppointments(clientId: number, filters?: AppointmentFilters): Observable<AppointmentsResponse> {
    return this.crmRepository.getClientAppointments(clientId, filters);
  }

  /**
   * Planifie un nouveau rendez-vous
   */
  createAppointment(clientId: number, request: CreateAppointmentRequest): Observable<ClientAppointment> {
    // Validation métier
    if (!request.title?.trim()) {
      throw new Error('Le titre du rendez-vous est obligatoire');
    }

    if (!request.scheduled_at) {
      throw new Error('La date du rendez-vous est obligatoire');
    }

    // Vérifier que la date n'est pas dans le passé
    const scheduledDate = new Date(request.scheduled_at);
    if (scheduledDate <= new Date()) {
      throw new Error('La date du rendez-vous ne peut pas être dans le passé');
    }

    if (request.duration <= 0) {
      throw new Error('La durée doit être supérieure à 0');
    }

    return this.crmRepository.createAppointment(clientId, request);
  }

  /**
   * Récupère un rendez-vous spécifique
   */
  getAppointment(appointmentId: number): Observable<ClientAppointment> {
    return this.crmRepository.getAppointment(appointmentId);
  }

  /**
   * Met à jour un rendez-vous
   */
  updateAppointment(appointmentId: number, request: UpdateAppointmentRequest): Observable<ClientAppointment> {
    return this.crmRepository.updateAppointment(appointmentId, request);
  }

  /**
   * Supprime un rendez-vous
   */
  deleteAppointment(appointmentId: number): Observable<void> {
    return this.crmRepository.deleteAppointment(appointmentId);
  }

  /**
   * Change le statut d'un rendez-vous
   */
  updateStatus(appointmentId: number, request: UpdateAppointmentStatusRequest): Observable<ClientAppointment> {
    return this.crmRepository.updateAppointmentStatus(appointmentId, request);
  }

  /**
   * Récupère les rendez-vous du jour
   */
  getTodayAppointments(): Observable<DashboardAppointmentsResponse> {
    return this.crmRepository.getTodayAppointments();
  }

  /**
   * Récupère les prochains rendez-vous
   */
  getUpcomingAppointments(days: number = 7, limit: number = 20): Observable<DashboardAppointmentsResponse> {
    return this.crmRepository.getUpcomingAppointments(days, limit);
  }
}