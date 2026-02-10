// ========================================
// SERVICE API COMPLET POUR LE TIME TRACKING
// Basé sur DOCUMENTATION_INTEGRATION_API.md
// ========================================

import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject, map, tap, catchError, interval } from 'rxjs';
import { ApiService, ApiResponse } from '../../../core/api/api.service';
import { LoggingService } from '../../../core/logging/logging.service';
import {
  TaskTimeEntry,
  TimeSession,
  CreateTimeEntryRequest,
  StartTimeSessionRequest,
  UserTimeSummary,
  ProjectTimeAnalytics
} from '../../tasks/models/task.models';

export interface TimeTrackingFilters {
  task_id?: number;
  project_id?: number;
  user_id?: number;
  date_from?: string;
  date_to?: string;
  task_type?: string;
  page?: number;
  per_page?: number;
}

export interface TimeReportData {
  total_hours: number;
  total_days: number;
  average_hours_per_day: number;
  entries_by_date: { [date: string]: number };
  entries_by_project: { [project: string]: number };
  entries_by_task_type: { [type: string]: number };
  recent_entries: TaskTimeEntry[];
}

export interface UserTimeStats {
  today_hours: number;
  week_hours: number;
  month_hours: number;
  average_daily_hours: number;
  productive_days: number;
  most_productive_hour: number;
  efficiency_score: number;
}

@Injectable({
  providedIn: 'root'
})
export class TimeTrackingApiService {
  private apiService = inject(ApiService);
  private loggingService = inject(LoggingService);

  // État global du time tracking
  private currentSessionSubject = new BehaviorSubject<TimeSession | null>(null);
  private todayTimeSubject = new BehaviorSubject<number>(0);
  private weekTimeSubject = new BehaviorSubject<number>(0);

  // Observables publics
  public currentSession$ = this.currentSessionSubject.asObservable();
  public todayTime$ = this.todayTimeSubject.asObservable();
  public weekTime$ = this.weekTimeSubject.asObservable();

  // Configuration du timer
  private timerSubscription?: any;
  private sessionStartTime?: Date;

  constructor() {
    this.loadCurrentSession();
    this.loadTodayStats();
  }

  // ========================================
  // GESTION DES SESSIONS DE TEMPS
  // ========================================

  /**
   * Obtenir la session de temps actuelle
   */
  getCurrentSession(): Observable<ApiResponse<TimeSession | null>> {
    return this.apiService.get<ApiResponse<TimeSession | null>>('/time/current-session')
      .pipe(
        tap(response => {
          this.currentSessionSubject.next(response.data || null);
          if (response.data?.is_active) {
            this.startTimer();
          } else {
            this.stopTimer();
          }

          this.loggingService.debug('Current session loaded', {
            component: 'TimeTrackingApiService',
            action: 'getCurrentSession',
            data: { hasSession: !!response.data, isActive: response.data?.is_active }
          });
        }),
        catchError(error => {
          this.loggingService.error('Failed to load current session', {
            component: 'TimeTrackingApiService',
            action: 'getCurrentSession',
            data: { error: error.message }
          });
          throw error;
        })
      );
  }

  /**
   * Démarrer une session de temps
   */
  startSession(taskId: number, sessionData?: StartTimeSessionRequest): Observable<ApiResponse<TimeSession>> {
    this.loggingService.debug('Starting time session', {
      component: 'TimeTrackingApiService',
      action: 'startSession',
      data: { taskId, description: sessionData?.description }
    });

    return this.apiService.post<ApiResponse<TimeSession>>(`/tasks/${taskId}/time/start`, sessionData || {})
      .pipe(
        tap(response => {
          if (response.data) {
            this.currentSessionSubject.next(response.data);
            this.sessionStartTime = new Date();
            this.startTimer();
          }

          this.loggingService.info('Time session started successfully', {
            component: 'TimeTrackingApiService',
            action: 'startSession',
            data: { taskId, sessionId: response.data?.id }
          });
        }),
        catchError(error => {
          this.loggingService.error('Failed to start time session', {
            component: 'TimeTrackingApiService',
            action: 'startSession',
            data: { error: error.message, taskId }
          });
          throw error;
        })
      );
  }

  /**
   * Arrêter une session de temps
   */
  stopSession(sessionId: number): Observable<ApiResponse<TaskTimeEntry>> {
    this.loggingService.debug('Stopping time session', {
      component: 'TimeTrackingApiService',
      action: 'stopSession',
      data: { sessionId }
    });

    return this.apiService.put<ApiResponse<TaskTimeEntry>>(`/time-entries/${sessionId}/stop`, {})
      .pipe(
        tap(response => {
          this.currentSessionSubject.next(null);
          this.stopTimer();
          this.sessionStartTime = undefined;

          // Mettre à jour les statistiques du jour
          if (response.data?.hours) {
            const currentTodayTime = this.todayTimeSubject.value;
            this.todayTimeSubject.next(currentTodayTime + response.data.hours);
          }

          this.loggingService.info('Time session stopped successfully', {
            component: 'TimeTrackingApiService',
            action: 'stopSession',
            data: { sessionId, hours: response.data?.hours }
          });
        }),
        catchError(error => {
          this.loggingService.error('Failed to stop time session', {
            component: 'TimeTrackingApiService',
            action: 'stopSession',
            data: { error: error.message, sessionId }
          });
          throw error;
        })
      );
  }

  /**
   * Mettre en pause une session
   */
  pauseSession(sessionId: number): Observable<ApiResponse<TimeSession>> {
    return this.apiService.put<ApiResponse<TimeSession>>(`/time-entries/${sessionId}/pause`, {})
      .pipe(
        tap(response => {
          if (response.data) {
            this.currentSessionSubject.next(response.data);
          }
          this.stopTimer();
        })
      );
  }

  /**
   * Reprendre une session en pause
   */
  resumeSession(sessionId: number): Observable<ApiResponse<TimeSession>> {
    return this.apiService.put<ApiResponse<TimeSession>>(`/time-entries/${sessionId}/resume`, {})
      .pipe(
        tap(response => {
          if (response.data) {
            this.currentSessionSubject.next(response.data);
          }
          this.startTimer();
        })
      );
  }

  // ========================================
  // SAISIES DE TEMPS MANUELLES
  // ========================================

  /**
   * Saisir du temps manuellement
   */
  addTimeEntry(taskId: number, timeData: CreateTimeEntryRequest): Observable<ApiResponse<TaskTimeEntry>> {
    this.loggingService.debug('Adding manual time entry', {
      component: 'TimeTrackingApiService',
      action: 'addTimeEntry',
      data: { taskId, hours: timeData.hours, date: timeData.date }
    });

    return this.apiService.post<ApiResponse<TaskTimeEntry>>(`/tasks/${taskId}/time-entries`, timeData)
      .pipe(
        tap(response => {
          // Mettre à jour les statistiques si c'est aujourd'hui
          const today = new Date().toISOString().split('T')[0];
          if (timeData.date === today && response.data?.hours) {
            const currentTodayTime = this.todayTimeSubject.value;
            this.todayTimeSubject.next(currentTodayTime + response.data.hours);
          }

          this.loggingService.info('Time entry added successfully', {
            component: 'TimeTrackingApiService',
            action: 'addTimeEntry',
            data: { taskId, hours: timeData.hours }
          });
        }),
        catchError(error => {
          this.loggingService.error('Failed to add time entry', {
            component: 'TimeTrackingApiService',
            action: 'addTimeEntry',
            data: { error: error.message, taskId }
          });
          throw error;
        })
      );
  }

  /**
   * Modifier une saisie de temps
   */
  updateTimeEntry(entryId: number, timeData: Partial<CreateTimeEntryRequest>): Observable<ApiResponse<TaskTimeEntry>> {
    this.loggingService.debug('Updating time entry', {
      component: 'TimeTrackingApiService',
      action: 'updateTimeEntry',
      data: { entryId, changes: Object.keys(timeData) }
    });

    return this.apiService.put<ApiResponse<TaskTimeEntry>>(`/time-entries/${entryId}`, timeData)
      .pipe(
        tap(() => {
          this.loggingService.info('Time entry updated successfully', {
            component: 'TimeTrackingApiService',
            action: 'updateTimeEntry',
            data: { entryId }
          });
        }),
        catchError(error => {
          this.loggingService.error('Failed to update time entry', {
            component: 'TimeTrackingApiService',
            action: 'updateTimeEntry',
            data: { error: error.message, entryId }
          });
          throw error;
        })
      );
  }

  /**
   * Supprimer une saisie de temps
   */
  deleteTimeEntry(entryId: number): Observable<ApiResponse<void>> {
    this.loggingService.debug('Deleting time entry', {
      component: 'TimeTrackingApiService',
      action: 'deleteTimeEntry',
      data: { entryId }
    });

    return this.apiService.delete<ApiResponse<void>>(`/time-entries/${entryId}`)
      .pipe(
        tap(() => {
          this.loggingService.info('Time entry deleted successfully', {
            component: 'TimeTrackingApiService',
            action: 'deleteTimeEntry',
            data: { entryId }
          });
        }),
        catchError(error => {
          this.loggingService.error('Failed to delete time entry', {
            component: 'TimeTrackingApiService',
            action: 'deleteTimeEntry',
            data: { error: error.message, entryId }
          });
          throw error;
        })
      );
  }

  // ========================================
  // CONSULTATIONS ET RAPPORTS
  // ========================================

  /**
   * Obtenir mes saisies de temps
   */
  getMyTimeEntries(filters?: TimeTrackingFilters): Observable<ApiResponse<TaskTimeEntry[]>> {
    const params = this.buildTimeFilters(filters);
    return this.apiService.get<ApiResponse<TaskTimeEntry[]>>('/time/my-sessions', { params });
  }

  /**
   * Obtenir mon résumé de temps
   */
  getMyTimeSummary(dateFrom?: string, dateTo?: string): Observable<ApiResponse<UserTimeSummary>> {
    const params: any = {};
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;

    return this.apiService.get<ApiResponse<UserTimeSummary>>('/time/my-summary', { params })
      .pipe(
        tap(response => {
          if (response.data) {
            this.weekTimeSubject.next(response.data.total_hours);
          }
        })
      );
  }

  /**
   * Générer un rapport de temps
   */
  generateTimeReport(filters?: TimeTrackingFilters): Observable<ApiResponse<TimeReportData>> {
    const params = this.buildTimeFilters(filters);
    return this.apiService.get<ApiResponse<TimeReportData>>('/time/report', { params });
  }

  /**
   * Exporter mes saisies de temps
   */
  exportTimeEntries(format: 'excel' | 'pdf' | 'csv', filters?: TimeTrackingFilters): Observable<Blob> {
    const params = this.buildTimeFilters(filters);
    params.format = format;

    return this.apiService.get<Blob>('/time/my-entries/export', {
      params,
      responseType: 'blob'
    });
  }

  /**
   * Obtenir mes statistiques de temps
   */
  getMyTimeStats(): Observable<ApiResponse<UserTimeStats>> {
    return this.apiService.get<ApiResponse<UserTimeStats>>('/time/my-stats')
      .pipe(
        tap(response => {
          if (response.data) {
            this.todayTimeSubject.next(response.data.today_hours);
            this.weekTimeSubject.next(response.data.week_hours);
          }
        })
      );
  }

  // ========================================
  // CONSULTATIONS PROJET
  // ========================================

  /**
   * Obtenir le résumé temps d'un projet
   */
  getProjectTimeSummary(projectId: number): Observable<ApiResponse<any>> {
    return this.apiService.get<ApiResponse<any>>(`/projects/${projectId}/time-summary`);
  }

  /**
   * Obtenir les saisies de temps d'un projet
   */
  getProjectTimeEntries(projectId: number, filters?: TimeTrackingFilters): Observable<ApiResponse<TaskTimeEntry[]>> {
    const params = this.buildTimeFilters(filters);
    return this.apiService.get<ApiResponse<TaskTimeEntry[]>>(`/projects/${projectId}/time-entries`, { params });
  }

  /**
   * Obtenir les analytics temps d'un projet
   */
  getProjectTimeAnalytics(projectId: number): Observable<ApiResponse<ProjectTimeAnalytics>> {
    return this.apiService.get<ApiResponse<ProjectTimeAnalytics>>(`/projects/${projectId}/time-analytics`);
  }

  // ========================================
  // CONSULTATIONS TÂCHE
  // ========================================

  /**
   * Obtenir le résumé temps d'une tâche
   */
  getTaskTimeSummary(taskId: number): Observable<ApiResponse<any>> {
    return this.apiService.get<ApiResponse<any>>(`/tasks/${taskId}/time-summary`);
  }

  /**
   * Obtenir les saisies de temps d'une tâche
   */
  getTaskTimeEntries(taskId: number): Observable<ApiResponse<TaskTimeEntry[]>> {
    return this.apiService.get<ApiResponse<TaskTimeEntry[]>>(`/tasks/${taskId}/time-entries`);
  }

  // ========================================
  // TIMER ET TEMPS RÉEL
  // ========================================

  /**
   * Démarrer le timer interne
   */
  private startTimer(): void {
    this.stopTimer(); // Arrêter le timer existant
    this.timerSubscription = interval(1000).subscribe(() => {
      const currentSession = this.currentSessionSubject.value;
      if (currentSession && currentSession.is_active) {
        // Émettre des mises à jour du temps écoulé
        this.updateSessionElapsedTime();
      }
    });
  }

  /**
   * Arrêter le timer interne
   */
  private stopTimer(): void {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
      this.timerSubscription = undefined;
    }
  }

  /**
   * Mettre à jour le temps écoulé de la session
   */
  private updateSessionElapsedTime(): void {
    const currentSession = this.currentSessionSubject.value;
    if (currentSession && this.sessionStartTime) {
      const now = new Date();
      const elapsedMs = now.getTime() - this.sessionStartTime.getTime();
      const elapsedHours = elapsedMs / (1000 * 60 * 60);

      // Émettre la session mise à jour avec le temps écoulé
      const updatedSession = {
        ...currentSession,
        elapsed_time: elapsedHours
      };
      this.currentSessionSubject.next(updatedSession);
    }
  }

  /**
   * Obtenir le temps écoulé de la session actuelle (en secondes)
   */
  getCurrentSessionElapsed(): number {
    const currentSession = this.currentSessionSubject.value;
    if (!currentSession || !currentSession.is_active || !this.sessionStartTime) {
      return 0;
    }

    const now = new Date();
    return Math.floor((now.getTime() - this.sessionStartTime.getTime()) / 1000);
  }

  // ========================================
  // MÉTHODES UTILITAIRES PRIVÉES
  // ========================================

  /**
   * Charger la session actuelle au démarrage
   */
  private loadCurrentSession(): void {
    this.getCurrentSession().subscribe({
      next: (response) => {
        if (response.data && response.data.is_active) {
          // Calculer le temps de début de session
          const startTime = new Date(response.data.start_time);
          this.sessionStartTime = startTime;
        }
      },
      error: (error) => {
        this.loggingService.error('Failed to load current session on startup', {
          component: 'TimeTrackingApiService',
          action: 'loadCurrentSession',
          data: { error: error.message }
        });
      }
    });
  }

  /**
   * Charger les statistiques du jour
   */
  private loadTodayStats(): void {
    this.getMyTimeStats().subscribe({
      error: (error) => {
        this.loggingService.error('Failed to load today stats', {
          component: 'TimeTrackingApiService',
          action: 'loadTodayStats',
          data: { error: error.message }
        });
      }
    });
  }

  /**
   * Construire les paramètres de filtre
   */
  private buildTimeFilters(filters?: TimeTrackingFilters): any {
    if (!filters) return {};

    const params: any = {};

    if (filters.task_id) params.task_id = filters.task_id;
    if (filters.project_id) params.project_id = filters.project_id;
    if (filters.user_id) params.user_id = filters.user_id;
    if (filters.date_from) params.date_from = filters.date_from;
    if (filters.date_to) params.date_to = filters.date_to;
    if (filters.task_type) params.task_type = filters.task_type;
    if (filters.page) params.page = filters.page;
    if (filters.per_page) params.per_page = filters.per_page;

    return params;
  }

  // ========================================
  // MÉTHODES PUBLIQUES UTILITAIRES
  // ========================================

  /**
   * Vérifier si une session est active
   */
  hasActiveSession(): boolean {
    const session = this.currentSessionSubject.value;
    return session?.is_active || false;
  }

  /**
   * Obtenir la session actuelle (synchrone)
   */
  getCurrentSessionSync(): TimeSession | null {
    return this.currentSessionSubject.value;
  }

  /**
   * Obtenir le temps du jour (synchrone)
   */
  getTodayTimeSync(): number {
    return this.todayTimeSubject.value;
  }

  /**
   * Obtenir le temps de la semaine (synchrone)
   */
  getWeekTimeSync(): number {
    return this.weekTimeSubject.value;
  }

  /**
   * Formater le temps en heures et minutes
   */
  formatTime(hours: number): string {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);

    if (wholeHours === 0) {
      return `${minutes}min`;
    } else if (minutes === 0) {
      return `${wholeHours}h`;
    } else {
      return `${wholeHours}h ${minutes}min`;
    }
  }

  /**
   * Formater le temps écoulé en secondes
   */
  formatElapsedTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  }

  /**
   * Nettoyer les ressources
   */
  ngOnDestroy(): void {
    this.stopTimer();
  }
}