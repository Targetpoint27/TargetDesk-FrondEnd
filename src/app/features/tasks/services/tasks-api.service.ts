// ========================================
// SERVICE API POUR LA GESTION DE TÂCHES
// Version complète avec intégration backend - 27 endpoints
// ========================================

import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../../../core/api/api.service';
import {
  Task,
  TaskFilters,
  CreateTaskRequest,
  UpdateTaskRequest,
  UpdateTaskStatusRequest,
  AssignTaskRequest,
  CreateCommentRequest,
  CreateDifficultyRequest,
  ResolveDifficultyRequest,
  CreateTimeEntryRequest,
  StartTimeTrackingRequest,
  CreateTaskViewRequest,
  PaginatedTaskResponse
} from '../../../shared/interfaces/task.interface';

@Injectable({
  providedIn: 'root'
})
export class TasksApiService {
  private apiService = inject(ApiService);
  private readonly baseEndpoint = 'tasks';

  // === GESTION DES TÂCHES (8 endpoints) ===

  // 1. GET /api/v1/tasks - Lister toutes les tâches avec filtres
  getTasks(filters?: TaskFilters): Observable<any> {
    const params = this.buildQueryParams(filters);
    return this.apiService.get(`${this.baseEndpoint}${params}`);
  }

  // 2. POST /api/v1/tasks - Créer une nouvelle tâche
  createTask(projectId: number, taskData: CreateTaskRequest): Observable<any> {
    return this.apiService.post(`projects/${projectId}/tasks`, taskData);
  }

  // 3. GET /api/v1/tasks/{task} - Voir les détails d'une tâche
  getTask(id: number, include?: string[]): Observable<any> {
    const params = include ? `?include=${include.join(',')}` : '';
    return this.apiService.get(`${this.baseEndpoint}/${id}${params}`);
  }

  // 4. PUT /api/v1/tasks/{task} - Mettre à jour une tâche
  updateTask(id: number, taskData: UpdateTaskRequest): Observable<any> {
    return this.apiService.put(`${this.baseEndpoint}/${id}`, taskData);
  }

  // 5. DELETE /api/v1/tasks/{task} - Supprimer une tâche
  deleteTask(id: number): Observable<any> {
    return this.apiService.delete(`${this.baseEndpoint}/${id}`);
  }

  // 6. PUT /api/v1/tasks/{task}/status - Mettre à jour le statut d'une tâche
  updateTaskStatus(id: number, statusData: UpdateTaskStatusRequest): Observable<any> {
    return this.apiService.put(`${this.baseEndpoint}/${id}/status`, statusData);
  }

  // 7. POST /api/v1/tasks/{task}/assign - Assigner des utilisateurs à une tâche
  assignTask(id: number, assignData: AssignTaskRequest): Observable<any> {
    return this.apiService.post(`${this.baseEndpoint}/${id}/assign`, assignData);
  }

  // 8. DELETE /api/v1/tasks/{task}/assign/{user} - Désassigner un utilisateur d'une tâche
  unassignUser(taskId: number, userId: number): Observable<any> {
    return this.apiService.delete(`${this.baseEndpoint}/${taskId}/assign/${userId}`);
  }

  // === COMMENTAIRES (4 endpoints) ===

  // 9. GET /api/v1/tasks/{task}/comments - Lister les commentaires d'une tâche
  getTaskComments(id: number): Observable<any> {
    return this.apiService.get(`${this.baseEndpoint}/${id}/comments`);
  }

  // 10. POST /api/v1/tasks/{task}/comments - Ajouter un commentaire à une tâche
  addComment(taskId: number, commentData: CreateCommentRequest): Observable<any> {
    return this.apiService.post(`${this.baseEndpoint}/${taskId}/comments`, commentData);
  }

  // 11. PUT /api/v1/tasks/{task}/comments/{comment} - Modifier un commentaire
  updateComment(taskId: number, commentId: number, content: string): Observable<any> {
    return this.apiService.put(`${this.baseEndpoint}/${taskId}/comments/${commentId}`, { content });
  }

  // 12. DELETE /api/v1/tasks/{task}/comments/{comment} - Supprimer un commentaire
  deleteComment(taskId: number, commentId: number): Observable<any> {
    return this.apiService.delete(`${this.baseEndpoint}/${taskId}/comments/${commentId}`);
  }

  // === FICHIERS (4 endpoints) ===

  // 13. GET /api/v1/tasks/{task}/files - Lister les fichiers d'une tâche
  getTaskFiles(id: number): Observable<any> {
    return this.apiService.get(`${this.baseEndpoint}/${id}/files`);
  }

  // 14. POST /api/v1/tasks/{task}/files - Ajouter un fichier à une tâche
  uploadFile(taskId: number, fileData: FormData): Observable<any> {
    return this.apiService.post(`${this.baseEndpoint}/${taskId}/files`, fileData);
  }

  // 15. GET /api/v1/tasks/{task}/files/{file}/download - Télécharger un fichier
  downloadFile(taskId: number, fileId: number): Observable<Blob> {
    return this.apiService.get(`${this.baseEndpoint}/${taskId}/files/${fileId}/download`,
      { responseType: 'blob' as any });
  }

  // 16. DELETE /api/v1/tasks/{task}/files/{file} - Supprimer un fichier
  deleteFile(taskId: number, fileId: number): Observable<any> {
    return this.apiService.delete(`${this.baseEndpoint}/${taskId}/files/${fileId}`);
  }

  // === SUIVI DU TEMPS (5 endpoints) ===

  // 17. GET /api/v1/tasks/{task}/time-entries - Lister les entrées de temps d'une tâche
  getTaskTimeEntries(id: number): Observable<any> {
    return this.apiService.get(`${this.baseEndpoint}/${id}/time-entries`);
  }

  // 18. POST /api/v1/tasks/{task}/time-entries - Ajouter une entrée de temps manuelle
  addTimeEntry(taskId: number, timeData: CreateTimeEntryRequest): Observable<any> {
    return this.apiService.post(`${this.baseEndpoint}/${taskId}/time-entries`, timeData);
  }

  // 19. POST /api/v1/tasks/{task}/time-tracking/start - Démarrer le suivi de temps
  startTimeTracking(taskId: number, trackingData: StartTimeTrackingRequest): Observable<any> {
    return this.apiService.post(`${this.baseEndpoint}/${taskId}/time-tracking/start`, trackingData);
  }

  // 20. POST /api/v1/tasks/{task}/time-tracking/stop - Arrêter le suivi de temps
  stopTimeTracking(taskId: number): Observable<any> {
    return this.apiService.post(`${this.baseEndpoint}/${taskId}/time-tracking/stop`, {});
  }

  // 21. GET /api/v1/tasks/{task}/time-summary - Résumé du temps passé sur une tâche
  getTaskTimeSummary(id: number): Observable<any> {
    return this.apiService.get(`${this.baseEndpoint}/${id}/time-summary`);
  }

  // === DIFFICULTÉS (3 endpoints) ===

  // 22. GET /api/v1/tasks/{task}/difficulties - Lister les difficultés d'une tâche
  getTaskDifficulties(id: number): Observable<any> {
    return this.apiService.get(`${this.baseEndpoint}/${id}/difficulties`);
  }

  // 23. POST /api/v1/tasks/{task}/difficulties - Signaler une difficulté
  reportDifficulty(taskId: number, difficultyData: CreateDifficultyRequest): Observable<any> {
    return this.apiService.post(`${this.baseEndpoint}/${taskId}/difficulties`, difficultyData);
  }

  // 24. POST /api/v1/tasks/{task}/difficulties/{difficulty}/resolve - Résoudre une difficulté
  resolveDifficulty(taskId: number, difficultyId: number, resolutionData: ResolveDifficultyRequest): Observable<any> {
    return this.apiService.post(`${this.baseEndpoint}/${taskId}/difficulties/${difficultyId}/resolve`, resolutionData);
  }

  // === VUES PERSONNALISÉES (3 endpoints) ===

  // 25. GET /api/v1/task-views - Lister les vues de tâches personnalisées
  getTaskViews(): Observable<any> {
    return this.apiService.get('task-views');
  }

  // 26. POST /api/v1/task-views - Créer une vue de tâches personnalisée
  createTaskView(viewData: CreateTaskViewRequest): Observable<any> {
    return this.apiService.post('task-views', viewData);
  }

  // 27. DELETE /api/v1/task-views/{view} - Supprimer une vue de tâches
  deleteTaskView(id: number): Observable<any> {
    return this.apiService.delete(`task-views/${id}`);
  }

  // === MÉTHODES UTILITAIRES ===

  // Construire les paramètres de requête
  private buildQueryParams(filters?: any): string {
    if (!filters) return '';

    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
        if (Array.isArray(filters[key])) {
          filters[key].forEach((value: any) => {
            params.append(`${key}[]`, value.toString());
          });
        } else {
          params.append(key, filters[key].toString());
        }
      }
    });

    const paramString = params.toString();
    return paramString ? `?${paramString}` : '';
  }

  // === MÉTHODES DE COMPATIBILITÉ ET RACCOURCIS ===

  // Obtenir les tâches d'un projet spécifique
  getProjectTasks(projectId: number, filters?: TaskFilters): Observable<any> {
    const projectFilters = { ...filters, project_id: projectId };
    return this.getTasks(projectFilters);
  }

  // Obtenir mes tâches
  getMyTasks(filters?: TaskFilters): Observable<any> {
    const myFilters = { ...filters, my_tasks: true };
    return this.getTasks(myFilters);
  }

  // Rechercher des tâches
  searchTasks(query: string, filters?: TaskFilters): Observable<any> {
    const searchFilters = { ...filters, search: query };
    return this.getTasks(searchFilters);
  }

  // Obtenir les tâches en retard
  getOverdueTasks(filters?: TaskFilters): Observable<any> {
    const overdueFilters = { ...filters, overdue: true };
    return this.getTasks(overdueFilters);
  }

  // Obtenir le suivi de temps actuel de l'utilisateur
  getCurrentTimeSession(): Observable<any> {
    return this.apiService.get('time-tracking/current');
  }

  // Obtenir l'historique d'une tâche
  getTaskHistory(id: number): Observable<any> {
    return this.apiService.get(`${this.baseEndpoint}/${id}/history`);
  }
}