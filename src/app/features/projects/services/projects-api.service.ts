// ========================================
// SERVICE API POUR LA GESTION DE PROJETS
// Basé sur GESTION_PROJETS_API_DOCUMENTATION.md
// Base URL: /api/v1/projects
// ========================================

import { Injectable, inject } from '@angular/core';
import { Observable, throwError, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { HttpParams } from '@angular/common/http';

import { ApiService } from '../../../core/api/api.service';
import {
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
  AddTeamMemberRequest,
  UpdateProgressRequest,
  UpdateStatusRequest,
  ProjectFilters,
  ApiResponse,
  PaginatedProjectResponse,
  ProjectStatistics,
  ProjectProgress,
  ProjectTeamMember,
  ProjectHistory,
  Task,
  ProjectTimeline,
  ProjectStats,
  ProjectTimeSummary,
  ProjectTimeEntry,
  ProjectTimeAnalytics
} from '../models/project.models';

@Injectable({
  providedIn: 'root'
})
export class ProjectsApiService {
  private apiService = inject(ApiService);
  private readonly apiUrl = 'projects';

  // ========================================
  // GESTION DES PROJETS (CRUD)
  // ========================================

  /**
   * GET /api/v1/projects - Liste des projets avec filtres et pagination
   */
  getProjects(filters?: ProjectFilters, page = 1, perPage = 15): Observable<PaginatedProjectResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('per_page', perPage.toString());

    if (filters) {
      if (filters.my_projects) params = params.set('my_projects', 'true');
      if (filters.status) params = params.set('status', filters.status);
      if (filters.active_only) params = params.set('active_only', 'true');
      if (filters.department) params = params.set('department', filters.department);
      if (filters.search) params = params.set('search', filters.search);
    }

    return this.apiService.get<PaginatedProjectResponse>(this.apiUrl, { params })
      .pipe(
        map(response => this.handleSuccess(response)),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * GET /api/v1/projects/{id} - Détails d'un projet
   */
  getProject(id: number): Observable<Project> {
    return this.apiService.get<ApiResponse<Project>>(`${this.apiUrl}/${id}`)
      .pipe(
        map(response => this.handleSuccess(response).data!),
        catchError(error => this.handleError(error))
      );
  }


  /**
   * POST /api/v1/projects - Création d'un projet
   */
  createProject(projectData: CreateProjectRequest): Observable<ApiResponse<Project>> {
    return this.apiService.post<ApiResponse<Project>>(this.apiUrl, projectData)
      .pipe(
        map(response => this.handleSuccess(response)),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * PUT /api/v1/projects/{id} - Modification d'un projet
   */
  updateProject(id: number, updates: UpdateProjectRequest): Observable<ApiResponse<Project>> {
    return this.apiService.put<ApiResponse<Project>>(`${this.apiUrl}/${id}`, updates)
      .pipe(
        map(response => this.handleSuccess(response )),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * DELETE /api/v1/projects/{id} - Suppression d'un projet
   */
  deleteProject(id: number): Observable<ApiResponse<any>> {
    return this.apiService.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`)
      .pipe(
        map(response => this.handleSuccess(response )),
        catchError(error => this.handleError(error))
      );
  }

  // ========================================
  // GESTION D'ÉQUIPE
  // ========================================

  /**
   * GET /api/v1/projects/{id}/team - Équipe du projet
   */
  getProjectTeam(projectId: number): Observable<ApiResponse<ProjectTeamMember[]>> {
    return this.apiService.get<ApiResponse<ProjectTeamMember[]>>(`${this.apiUrl}/${projectId}/team`)
      .pipe(
        map(response => this.handleSuccess(response )),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * POST /api/v1/projects/{id}/team - Ajouter un membre à l'équipe
   */
  addTeamMember(projectId: number, memberData: AddTeamMemberRequest): Observable<ApiResponse<ProjectTeamMember>> {
    return this.apiService.post<ApiResponse<ProjectTeamMember>>(`${this.apiUrl}/${projectId}/team`, memberData)
      .pipe(
        map(response => this.handleSuccess(response )),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * DELETE /api/v1/projects/{id}/team/{memberId} - Retirer un membre de l'équipe
   */
  removeTeamMember(projectId: number, memberId: number): Observable<ApiResponse<any>> {
    return this.apiService.delete<ApiResponse<any>>(`${this.apiUrl}/${projectId}/team/${memberId}`)
      .pipe(
        map(response => this.handleSuccess(response )),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * PUT /api/v1/projects/{id}/team/{memberId} - Modifier un membre de l'équipe
   */
  updateTeamMember(projectId: number, memberId: number, updates: Partial<AddTeamMemberRequest>): Observable<ApiResponse<ProjectTeamMember>> {
    return this.apiService.put<ApiResponse<ProjectTeamMember>>(`${this.apiUrl}/${projectId}/team/${memberId}`, updates)
      .pipe(
        map(response => this.handleSuccess(response )),
        catchError(error => this.handleError(error))
      );
  }

  // ========================================
  // PROGRESSION ET STATUT
  // ========================================

  /**
   * GET /api/v1/projects/{id}/progress - Afficher la progression
   */
  getProjectProgress(projectId: number): Observable<ApiResponse<ProjectProgress>> {
    return this.apiService.get<ApiResponse<ProjectProgress>>(`${this.apiUrl}/${projectId}/progress`)
      .pipe(
        map(response => this.handleSuccess(response )),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * PUT /api/v1/projects/{id}/progress - Mettre à jour la progression
   */
  updateProjectProgress(projectId: number, progressData: UpdateProgressRequest): Observable<ApiResponse<ProjectProgress>> {
    return this.apiService.put<ApiResponse<ProjectProgress>>(`${this.apiUrl}/${projectId}/progress`, progressData)
      .pipe(
        map(response => this.handleSuccess(response )),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * PUT /api/v1/projects/{id}/status - Changer le statut
   */
  updateProjectStatus(projectId: number, statusData: UpdateStatusRequest): Observable<ApiResponse<Project>> {
    return this.apiService.put<ApiResponse<Project>>(`${this.apiUrl}/${projectId}/status`, statusData)
      .pipe(
        map(response => this.handleSuccess(response )),
        catchError(error => this.handleError(error))
      );
  }

  // ========================================
  // STATISTIQUES ET RAPPORTS
  // ========================================

  /**
   * GET /api/v1/projects/statistics - Statistiques globales
   */
  getProjectStatistics(): Observable<ApiResponse<ProjectStatistics>> {
    return this.apiService.get<ApiResponse<ProjectStatistics>>(`${this.apiUrl}/statistics`)
      .pipe(
        map(response => this.handleSuccess(response )),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * GET /api/v1/projects/department/{department} - Projets par département
   */
  getProjectsByDepartment(department: string, status?: string): Observable<ApiResponse<Project[]>> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);

    return this.apiService.get<ApiResponse<Project[]>>(`${this.apiUrl}/department/${department}`, { params })
      .pipe(
        map(response => this.handleSuccess(response )),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * GET /api/v1/projects/manager/{managerId} - Projets d'un gestionnaire
   */
  getProjectsByManager(managerId: number, status?: string): Observable<ApiResponse<Project[]>> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);

    return this.apiService.get<ApiResponse<Project[]>>(`${this.apiUrl}/manager/${managerId}`, { params })
      .pipe(
        map(response => this.handleSuccess(response )),
        catchError(error => this.handleError(error))
      );
  }

  // ========================================
  // FONCTIONNALITÉS AVANCÉES
  // ========================================

  /**
   * POST /api/v1/projects/{id}/duplicate - Dupliquer un projet
   */
  duplicateProject(projectId: number): Observable<ApiResponse<Project>> {
    return this.apiService.post<ApiResponse<Project>>(`${this.apiUrl}/${projectId}/duplicate`, {})
      .pipe(
        map(response => this.handleSuccess(response )),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * GET /api/v1/projects/{id}/history - Historique du projet
   */
  getProjectHistory(projectId: number, limit = 10): Observable<ApiResponse<ProjectHistory[]>> {
    let params = new HttpParams().set('limit', limit.toString());

    return this.apiService.get<ApiResponse<ProjectHistory[]>>(`${this.apiUrl}/${projectId}/history`, { params })
      .pipe(
        map(response => this.handleSuccess(response )),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * GET /api/v1/projects/{id}/tasks - Tâches d'un projet
   * TODO: Implement this when Task models are properly defined
   */
  getProjectTasks(projectId: number, filters?: { status?: string; limit?: number }): Observable<any[]> {
    // Temporary implementation - returns empty array
    console.log('getProjectTasks called for project:', projectId, 'with filters:', filters);
    return of([]);
  }

  // ========================================
  // NOUVEAUX ENDPOINTS INTÉGRÉS SELON LA DOCUMENTATION API
  // ========================================

  /**
   * GET /api/v1/projects/{id}/timeline - Timeline du projet
   */
  getProjectTimeline(projectId: number): Observable<ApiResponse<ProjectTimeline[]>> {
    return this.apiService.get<ApiResponse<ProjectTimeline[]>>(`${this.apiUrl}/${projectId}/timeline`)
      .pipe(
        map(response => this.handleSuccess(response)),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * GET /api/v1/projects/{id}/stats - Statistiques détaillées du projet
   */
  getProjectStats(projectId: number): Observable<ApiResponse<ProjectStats>> {
    return this.apiService.get<ApiResponse<ProjectStats>>(`${this.apiUrl}/${projectId}/stats`)
      .pipe(
        map(response => this.handleSuccess(response)),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * GET /api/v1/projects/{id}/time-summary - Résumé du temps projet
   */
  getProjectTimeSummary(projectId: number, params?: {
    start_date?: string;
    end_date?: string;
    user_id?: number
  }): Observable<ApiResponse<ProjectTimeSummary>> {
    let queryParams = new HttpParams();
    if (params) {
      if (params.start_date) queryParams = queryParams.set('start_date', params.start_date);
      if (params.end_date) queryParams = queryParams.set('end_date', params.end_date);
      if (params.user_id) queryParams = queryParams.set('user_id', params.user_id.toString());
    }

    return this.apiService.get<ApiResponse<ProjectTimeSummary>>(`${this.apiUrl}/${projectId}/time-summary`, { params: queryParams })
      .pipe(
        map(response => this.handleSuccess(response)),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * GET /api/v1/projects/{id}/time-entries - Entrées de temps du projet
   */
  getProjectTimeEntries(projectId: number, filters?: {
    user_id?: number;
    task_type?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    per_page?: number;
  }): Observable<ApiResponse<ProjectTimeEntry[]>> {
    let params = new HttpParams();
    if (filters) {
      if (filters.user_id) params = params.set('user_id', filters.user_id.toString());
      if (filters.task_type) params = params.set('task_type', filters.task_type);
      if (filters.date_from) params = params.set('date_from', filters.date_from);
      if (filters.date_to) params = params.set('date_to', filters.date_to);
      if (filters.page) params = params.set('page', filters.page.toString());
      if (filters.per_page) params = params.set('per_page', filters.per_page.toString());
    }

    return this.apiService.get<ApiResponse<ProjectTimeEntry[]>>(`${this.apiUrl}/${projectId}/time-entries`, { params })
      .pipe(
        map(response => this.handleSuccess(response)),
        catchError(error => this.handleError(error))
      );
  }

  /**
   * GET /api/v1/projects/{id}/time-analytics - Analytics de temps du projet
   */
  getProjectTimeAnalytics(projectId: number, params?: {
    start_date?: string;
    end_date?: string;
    granularity?: 'day' | 'week' | 'month';
    include_forecasting?: boolean;
  }): Observable<ApiResponse<ProjectTimeAnalytics>> {
    let queryParams = new HttpParams();
    if (params) {
      if (params.start_date) queryParams = queryParams.set('start_date', params.start_date);
      if (params.end_date) queryParams = queryParams.set('end_date', params.end_date);
      if (params.granularity) queryParams = queryParams.set('granularity', params.granularity);
      if (params.include_forecasting) queryParams = queryParams.set('include_forecasting', 'true');
    }

    return this.apiService.get<ApiResponse<ProjectTimeAnalytics>>(`${this.apiUrl}/${projectId}/time-analytics`, { params: queryParams })
      .pipe(
        map(response => this.handleSuccess(response)),
        catchError(error => this.handleError(error))
      );
  }

  // ========================================
  // MÉTHODES UTILITAIRES PRIVÉES
  // ========================================

  private handleSuccess<T>(response: T): T {
    return response;
  }

  private handleError(error: any): Observable<never> {
    let errorMessage = 'Une erreur est survenue';

    if (error?.error?.message) {
      errorMessage = error.error.message;
    } else if (error?.message) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    console.error('Erreur API Projects:', error);
    return throwError(() => new Error(errorMessage));
  }

  // ========================================
  // MÉTHODES DE VALIDATION CÔTÉ CLIENT
  // ========================================

  /**
   * Valide les données d'un projet avant soumission
   */
  validateProjectData(data: CreateProjectRequest | UpdateProjectRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validation pour création
    if ('name' in data && data.name) {
      if (!data.name || data.name.trim().length === 0) {
        errors.push('Le nom du projet est obligatoire');
      }
      if (data.name.length > 255) {
        errors.push('Le nom du projet ne peut pas dépasser 255 caractères');
      }
    }

    // Validation des dates
    if ('start_date' in data && 'planned_end_date' in data) {
      if (data.start_date && data.planned_end_date) {
        const startDate = new Date(data.start_date);
        const endDate = new Date(data.planned_end_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (startDate < today) {
          errors.push('La date de début ne peut pas être antérieure à aujourd\'hui');
        }

        if (endDate <= startDate) {
          errors.push('La date de fin doit être postérieure à la date de début');
        }
      }
    }

    // Validation budget
    if (data.estimated_budget !== undefined && data.estimated_budget !== null) {
      if (data.estimated_budget < 0) {
        errors.push('Le budget estimé ne peut pas être négatif');
      }
    }

    // Validation client externe
    if (data.client_type === 'externe') {
      if (!data.external_client_info) {
        errors.push('Les informations du client externe sont obligatoires');
      } else if (!data.external_client_info.name) {
        errors.push('Le nom du client externe est obligatoire');
      }
    }

    // Validation client interne
    if (data.client_type === 'interne') {
      if (!data.client_id) {
        errors.push('Vous devez sélectionner un client interne');
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Valide les données d'un membre d'équipe
   */
  validateTeamMemberData(data: AddTeamMemberRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.user_id) {
      errors.push('Vous devez sélectionner un utilisateur');
    }

    if (!data.role) {
      errors.push('Vous devez sélectionner un rôle');
    }

    if (data.hourly_rate !== undefined && data.hourly_rate !== null && data.hourly_rate < 0) {
      errors.push('Le tarif horaire ne peut pas être négatif');
    }

    return { isValid: errors.length === 0, errors };
  }
}