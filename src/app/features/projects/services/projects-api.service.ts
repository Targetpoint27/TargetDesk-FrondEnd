// ========================================
// SERVICE API POUR LA GESTION DE PROJETS
// Version complète avec intégration backend
// ========================================

import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { ApiService } from '../../../core/api/api.service';

interface ProjectFilters {
  page?: number;
  per_page?: number;
  status?: string;
  client_id?: number;
  manager_id?: number;
  search?: string;
  sort_by?: string;
  sort_direction?: string;
  with_stats?: boolean;
  department?: string;
  active_only?: boolean;
  my_projects?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ProjectsApiService {
  private apiService = inject(ApiService);
  private readonly baseEndpoint = 'projects';

  // === GESTION DES PROJETS (7 endpoints) ===

  // 1. GET /api/v1/projects - Lister tous les projets
  getProjects(filters?: ProjectFilters): Observable<any> {
    const params = this.buildQueryParams(filters);
    return this.apiService.get(`${this.baseEndpoint}${params}`);
  }

  // 2. POST /api/v1/projects - Créer un nouveau projet
  createProject(projectData: any): Observable<any> {
    return this.apiService.post(this.baseEndpoint, projectData);
  }

  // 3. GET /api/v1/projects/{project} - Voir les détails d'un projet
  getProject(id: number, include?: string[]): Observable<any> {
    const params = include ? `?include=${include.join(',')}` : '';
    return this.apiService.get(`${this.baseEndpoint}/${id}${params}`);
  }

  // 4. PUT /api/v1/projects/{project} - Mettre à jour un projet
  updateProject(id: number, projectData: any): Observable<any> {
    return this.apiService.put(`${this.baseEndpoint}/${id}`, projectData);
  }

  // 5. DELETE /api/v1/projects/{project} - Supprimer un projet
  deleteProject(id: number): Observable<any> {
    return this.apiService.delete(`${this.baseEndpoint}/${id}`);
  }

  // 6. POST /api/v1/projects/{project}/change-status - Changer le statut d'un projet
  changeProjectStatus(id: number, status: string): Observable<any> {
    return this.apiService.post(`${this.baseEndpoint}/${id}/change-status`, { status });
  }

  // 7. POST /api/v1/projects/{project}/duplicate - Dupliquer un projet
  duplicateProject(id: number): Observable<any> {
    return this.apiService.post(`${this.baseEndpoint}/${id}/duplicate`, {});
  }

  // === ÉQUIPE PROJET (4 endpoints) ===

  // 8. GET /api/v1/projects/{project}/team - Lister l'équipe du projet
  getProjectTeam(id: number): Observable<any> {
    return this.apiService.get(`${this.baseEndpoint}/${id}/team`);
  }

  // 9. POST /api/v1/projects/{project}/team - Ajouter un membre à l'équipe
  addTeamMember(projectId: number, userData: any): Observable<any> {
    return this.apiService.post(`${this.baseEndpoint}/${projectId}/team`, userData);
  }

  // 10. DELETE /api/v1/projects/{project}/team/{teamMember} - Retirer un membre de l'équipe
  removeTeamMember(projectId: number, teamMemberId: number): Observable<any> {
    return this.apiService.delete(`${this.baseEndpoint}/${projectId}/team/${teamMemberId}`);
  }

  // 11. PUT /api/v1/projects/{project}/team/{teamMember}/role - Modifier le rôle d'un membre
  updateTeamMemberRole(projectId: number, teamMemberId: number, roleData: any): Observable<any> {
    return this.apiService.put(`${this.baseEndpoint}/${projectId}/team/${teamMemberId}/role`, roleData);
  }

  // === HISTORIQUE PROJET (2 endpoints) ===

  // 12. GET /api/v1/projects/{project}/history - Voir l'historique des modifications
  getProjectHistory(id: number, limit?: number): Observable<any> {
    const params = limit ? `?limit=${limit}` : '';
    return this.apiService.get(`${this.baseEndpoint}/${id}/history${params}`);
  }

  // 13. GET /api/v1/projects/{project}/activity-log - Journal d'activité du projet
  getProjectActivityLog(id: number): Observable<any> {
    return this.apiService.get(`${this.baseEndpoint}/${id}/activity-log`);
  }

  // === STATISTIQUES ET RAPPORTS PROJETS (7 endpoints) ===

  // 14. GET /api/v1/projects/statistics - Statistiques globales des projets
  getProjectStatistics(): Observable<any> {
    return this.apiService.get(`${this.baseEndpoint}/statistics`);
  }

  // 15. GET /api/v1/projects/department/{department} - Projets par département
  getProjectsByDepartment(department: string): Observable<any> {
    return this.apiService.get(`${this.baseEndpoint}/department/${department}`);
  }

  // 16. GET /api/v1/projects/manager/{manager} - Projets par manager
  getProjectsByManager(managerId: number): Observable<any> {
    return this.apiService.get(`${this.baseEndpoint}/manager/${managerId}`);
  }

  // 17. GET /api/v1/projects/{project}/time-summary - Résumé temps du projet
  getProjectTimeSummary(id: number): Observable<any> {
    return this.apiService.get(`${this.baseEndpoint}/${id}/time-summary`);
  }

  // 18. GET /api/v1/projects/{project}/time-entries - Entrées de temps du projet
  getProjectTimeEntries(id: number, filters?: any): Observable<any> {
    const params = this.buildQueryParams(filters);
    return this.apiService.get(`${this.baseEndpoint}/${id}/time-entries${params}`);
  }

  // 19. GET /api/v1/projects/{project}/time-analytics - Analyse temporelle du projet
  getProjectTimeAnalytics(id: number): Observable<any> {
    return this.apiService.get(`${this.baseEndpoint}/${id}/time-analytics`);
  }

  // 20. GET /api/v1/projects/{project}/progress - Progression du projet
  getProjectProgress(id: number): Observable<any> {
    return this.apiService.get(`${this.baseEndpoint}/${id}/progress`);
  }

  // Méthodes utilitaires
  private buildQueryParams(filters?: any): string {
    if (!filters) return '';

    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      const value = filters[key];
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    const paramString = params.toString();
    return paramString ? `?${paramString}` : '';
  }

  // === MÉTHODES DE COMPATIBILITÉ POUR L'EXISTANT ===

  // Alias pour changeProjectStatus (méthode existante)
  updateProjectStatus(id: number, status: string, comment?: string): Observable<any> {
    return this.changeProjectStatus(id, status);
  }

  // Alias pour getProjectsByManager avec id numérique
  getProjectMetrics(filters?: any): Observable<any> {
    return this.getProjectStatistics();
  }

  // Méthodes manquantes pour compatibilité
  getProjectTimeline(id: number): Observable<any> {
    return this.getProjectActivityLog(id);
  }

  getProjectStats(id: number): Observable<any> {
    return this.getProject(id).pipe(
      map((response: any) => ({
        data: {
          progress_percentage: response.data?.progress || 0,
          completed_tasks: response.data?.completed_tasks || 0,
          total_tasks: response.data?.total_tasks || 0,
          team_members_count: response.data?.team_members?.length || 0
        }
      }))
    );
  }
}