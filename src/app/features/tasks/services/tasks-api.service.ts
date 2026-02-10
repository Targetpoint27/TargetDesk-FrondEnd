// ========================================
// SERVICE API COMPLET POUR LA GESTION DES TÂCHES
// Basé sur DOCUMENTATION_INTEGRATION_API.md
// ========================================

import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject, map, tap, catchError, of } from 'rxjs';
import { ApiService, ApiResponse } from '../../../core/api/api.service';
import { LoggingService } from '../../../core/logging/logging.service';
import {
  Task,
  TaskFilters,
  CreateTaskRequest,
  UpdateTaskRequest,
  UpdateTaskStatusRequest,
  AssignTaskRequest,
  TaskComment,
  CreateCommentRequest,
  UpdateCommentRequest,
  TaskFile,
  TaskTimeEntry,
  CreateTimeEntryRequest,
  StartTimeSessionRequest,
  TimeSession,
  TaskDifficulty,
  CreateDifficultyRequest,
  ResolveDifficultyRequest,
  TaskTag,
  CreateTaskTagRequest,
  TaskView,
  SaveTaskViewRequest,
  TaskSummary,
  TaskStatusOption,
  TaskHistory
} from '../models/task.models';

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    current_page: number;
    total: number;
    per_page: number;
    last_page: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class TasksApiService {
  private apiService = inject(ApiService);
  private loggingService = inject(LoggingService);

  // State management
  private currentTaskSubject = new BehaviorSubject<Task | null>(null);
  private currentTimeSessionSubject = new BehaviorSubject<TimeSession | null>(null);

  // Observables
  public currentTask$ = this.currentTaskSubject.asObservable();
  public currentTimeSession$ = this.currentTimeSessionSubject.asObservable();

  constructor() {
    this.loadCurrentTimeSession();
  }

  // ========================================
  // GESTION DES TÂCHES (CRUD)
  // ========================================

  /**
   * Lister les tâches avec filtres
   */
  getTasks(filters?: TaskFilters): Observable<PaginatedResponse<Task>> {
    const params = this.buildTaskFilters(filters);

    this.loggingService.debug('Fetching tasks with filters', {
      component: 'TasksApiService',
      action: 'getTasks',
      data: { filters, params }
    });

    return this.apiService.get<PaginatedResponse<Task>>('/tasks', { params })
      .pipe(
        tap(response => {
          this.loggingService.debug('Tasks fetched successfully', {
            component: 'TasksApiService',
            action: 'getTasks',
            data: { count: response.data.length, total: response.meta.total }
          });
        }),
        catchError(error => {
          this.loggingService.error('Failed to fetch tasks', {
            component: 'TasksApiService',
            action: 'getTasks',
            data: { error: error.message, filters }
          });
          throw error;
        })
      );
  }

  /**
   * Obtenir les détails d'une tâche
   */
  getTask(id: number, include?: string): Observable<ApiResponse<Task>> {
    const params = include ? { include } : undefined;

    this.loggingService.debug('Fetching task details', {
      component: 'TasksApiService',
      action: 'getTask',
      data: { id, include }
    });

    return this.apiService.get<ApiResponse<Task>>(`/tasks/${id}`, { params })
      .pipe(
        tap(response => {
          if (response.data) {
            this.currentTaskSubject.next(response.data);
          }
          this.loggingService.debug('Task details fetched successfully', {
            component: 'TasksApiService',
            action: 'getTask',
            data: { id, task: response.data?.title }
          });
        }),
        catchError(error => {
          this.loggingService.error('Failed to fetch task details', {
            component: 'TasksApiService',
            action: 'getTask',
            data: { error: error.message, id }
          });
          throw error;
        })
      );
  }

  /**
   * Créer une nouvelle tâche
   */
  createTask(projectId: number, taskData: CreateTaskRequest): Observable<ApiResponse<Task>> {
    this.loggingService.debug('Creating new task', {
      component: 'TasksApiService',
      action: 'createTask',
      data: { projectId, title: taskData.title }
    });

    return this.apiService.post<ApiResponse<Task>>(`/projects/${projectId}/tasks`, taskData)
      .pipe(
        tap(response => {
          this.loggingService.info('Task created successfully', {
            component: 'TasksApiService',
            action: 'createTask',
            data: { id: response.data?.id, title: response.data?.title }
          });
        }),
        catchError(error => {
          this.loggingService.error('Failed to create task', {
            component: 'TasksApiService',
            action: 'createTask',
            data: { error: error.message, projectId, taskData }
          });
          throw error;
        })
      );
  }

  /**
   * Mettre à jour une tâche
   */
  updateTask(id: number, taskData: UpdateTaskRequest): Observable<ApiResponse<Task>> {
    this.loggingService.debug('Updating task', {
      component: 'TasksApiService',
      action: 'updateTask',
      data: { id, changes: Object.keys(taskData) }
    });

    return this.apiService.put<ApiResponse<Task>>(`/tasks/${id}`, taskData)
      .pipe(
        tap(response => {
          if (response.data) {
            this.currentTaskSubject.next(response.data);
          }
          this.loggingService.info('Task updated successfully', {
            component: 'TasksApiService',
            action: 'updateTask',
            data: { id, title: response.data?.title }
          });
        }),
        catchError(error => {
          this.loggingService.error('Failed to update task', {
            component: 'TasksApiService',
            action: 'updateTask',
            data: { error: error.message, id, taskData }
          });
          throw error;
        })
      );
  }

  /**
   * Supprimer une tâche
   */
  deleteTask(id: number): Observable<ApiResponse<void>> {
    this.loggingService.debug('Deleting task', {
      component: 'TasksApiService',
      action: 'deleteTask',
      data: { id }
    });

    return this.apiService.delete<ApiResponse<void>>(`/tasks/${id}`)
      .pipe(
        tap(() => {
          if (this.currentTaskSubject.value?.id === id) {
            this.currentTaskSubject.next(null);
          }
          this.loggingService.info('Task deleted successfully', {
            component: 'TasksApiService',
            action: 'deleteTask',
            data: { id }
          });
        }),
        catchError(error => {
          this.loggingService.error('Failed to delete task', {
            component: 'TasksApiService',
            action: 'deleteTask',
            data: { error: error.message, id }
          });
          throw error;
        })
      );
  }

  // ========================================
  // GESTION DES STATUTS
  // ========================================

  /**
   * Obtenir la liste des statuts disponibles
   */
  getTaskStatuses(): Observable<ApiResponse<TaskStatusOption[]>> {
    return this.apiService.get<ApiResponse<TaskStatusOption[]>>('/task-statuses');
  }

  /**
   * Changer le statut d'une tâche
   */
  updateTaskStatus(id: number, statusData: UpdateTaskStatusRequest): Observable<ApiResponse<Task>> {
    this.loggingService.debug('Updating task status', {
      component: 'TasksApiService',
      action: 'updateTaskStatus',
      data: { id, status: statusData.status }
    });

    return this.apiService.put<ApiResponse<Task>>(`/tasks/${id}/status`, statusData)
      .pipe(
        tap(response => {
          if (response.data) {
            this.currentTaskSubject.next(response.data);
          }
          this.loggingService.info('Task status updated successfully', {
            component: 'TasksApiService',
            action: 'updateTaskStatus',
            data: { id, status: statusData.status }
          });
        }),
        catchError(error => {
          this.loggingService.error('Failed to update task status', {
            component: 'TasksApiService',
            action: 'updateTaskStatus',
            data: { error: error.message, id, statusData }
          });
          throw error;
        })
      );
  }

  // ========================================
  // GESTION DES ASSIGNATIONS
  // ========================================

  /**
   * Modifier les assignations d'une tâche
   */
  assignTask(id: number, assignData: AssignTaskRequest): Observable<ApiResponse<Task>> {
    this.loggingService.debug('Assigning task to users', {
      component: 'TasksApiService',
      action: 'assignTask',
      data: { id, userIds: assignData.user_ids }
    });

    return this.apiService.post<ApiResponse<Task>>(`/tasks/${id}/assign`, assignData)
      .pipe(
        tap(response => {
          if (response.data) {
            this.currentTaskSubject.next(response.data);
          }
          this.loggingService.info('Task assigned successfully', {
            component: 'TasksApiService',
            action: 'assignTask',
            data: { id, userCount: assignData.user_ids.length }
          });
        }),
        catchError(error => {
          this.loggingService.error('Failed to assign task', {
            component: 'TasksApiService',
            action: 'assignTask',
            data: { error: error.message, id, assignData }
          });
          throw error;
        })
      );
  }

  /**
   * Obtenir la liste des utilisateurs assignables pour un projet
   */
  getAssignableUsers(projectId: number): Observable<ApiResponse<any[]>> {
    return this.apiService.get<ApiResponse<any[]>>(`/projects/${projectId}/users`);
  }

  // ========================================
  // GESTION DES ÉTIQUETTES
  // ========================================

  /**
   * Lister les étiquettes
   */
  getTags(params?: { search?: string; sort_by?: string; include_usage?: boolean }): Observable<ApiResponse<TaskTag[]>> {
    return this.apiService.get<ApiResponse<TaskTag[]>>('/tags', { params });
  }

  /**
   * Créer une étiquette
   */
  createTag(tagData: CreateTaskTagRequest): Observable<ApiResponse<TaskTag>> {
    return this.apiService.post<ApiResponse<TaskTag>>('/tags', tagData);
  }

  /**
   * Supprimer une étiquette
   */
  deleteTag(id: number): Observable<ApiResponse<void>> {
    return this.apiService.delete<ApiResponse<void>>(`/tags/${id}`);
  }

  // ========================================
  // SYSTÈME DE COMMENTAIRES
  // ========================================

  /**
   * Lister les commentaires d'une tâche
   */
  getTaskComments(taskId: number, params?: { page?: number; per_page?: number; sort_direction?: 'asc' | 'desc' }): Observable<PaginatedResponse<TaskComment>> {
    return this.apiService.get<PaginatedResponse<TaskComment>>(`/tasks/${taskId}/comments`, { params });
  }

  /**
   * Ajouter un commentaire à une tâche
   */
  addComment(taskId: number, commentData: CreateCommentRequest): Observable<ApiResponse<TaskComment>> {
    this.loggingService.debug('Adding comment to task', {
      component: 'TasksApiService',
      action: 'addComment',
      data: { taskId, contentLength: commentData.content.length }
    });

    return this.apiService.post<ApiResponse<TaskComment>>(`/tasks/${taskId}/comments`, commentData)
      .pipe(
        tap(() => {
          this.loggingService.info('Comment added successfully', {
            component: 'TasksApiService',
            action: 'addComment',
            data: { taskId }
          });
        }),
        catchError(error => {
          this.loggingService.error('Failed to add comment', {
            component: 'TasksApiService',
            action: 'addComment',
            data: { error: error.message, taskId }
          });
          throw error;
        })
      );
  }

  /**
   * Modifier un commentaire
   */
  updateComment(commentId: number, commentData: UpdateCommentRequest): Observable<ApiResponse<TaskComment>> {
    return this.apiService.put<ApiResponse<TaskComment>>(`/comments/${commentId}`, commentData);
  }

  /**
   * Supprimer un commentaire
   */
  deleteComment(commentId: number): Observable<ApiResponse<void>> {
    return this.apiService.delete<ApiResponse<void>>(`/comments/${commentId}`);
  }

  // ========================================
  // GESTION DES FICHIERS
  // ========================================

  /**
   * Lister les fichiers d'une tâche
   */
  getTaskFiles(taskId: number): Observable<ApiResponse<TaskFile[]>> {
    return this.apiService.get<ApiResponse<TaskFile[]>>(`/tasks/${taskId}/files`);
  }

  /**
   * Joindre un fichier à une tâche
   */
  uploadFile(taskId: number, file: File, description?: string): Observable<ApiResponse<TaskFile>> {
    const formData = new FormData();
    formData.append('file', file);
    if (description) {
      formData.append('description', description);
    }

    this.loggingService.debug('Uploading file to task', {
      component: 'TasksApiService',
      action: 'uploadFile',
      data: { taskId, fileName: file.name, fileSize: file.size }
    });

    return this.apiService.post<ApiResponse<TaskFile>>(`/tasks/${taskId}/files`, formData)
      .pipe(
        tap(() => {
          this.loggingService.info('File uploaded successfully', {
            component: 'TasksApiService',
            action: 'uploadFile',
            data: { taskId, fileName: file.name }
          });
        }),
        catchError(error => {
          this.loggingService.error('Failed to upload file', {
            component: 'TasksApiService',
            action: 'uploadFile',
            data: { error: error.message, taskId, fileName: file.name }
          });
          throw error;
        })
      );
  }

  /**
   * Supprimer un fichier
   */
  deleteFile(fileId: number): Observable<ApiResponse<void>> {
    return this.apiService.delete<ApiResponse<void>>(`/task-files/${fileId}`);
  }

  /**
   * Obtenir l'URL de téléchargement d'un fichier
   */
  getFileDownloadUrl(fileId: number): string {
    return this.apiService.getFullUrl(`/task-files/${fileId}/download`);
  }

  // ========================================
  // GESTION DES DIFFICULTÉS
  // ========================================

  /**
   * Lister les difficultés d'une tâche
   */
  getTaskDifficulties(taskId: number): Observable<ApiResponse<TaskDifficulty[]>> {
    return this.apiService.get<ApiResponse<TaskDifficulty[]>>(`/tasks/${taskId}/difficulties`);
  }

  /**
   * Déclarer une difficulté
   */
  reportDifficulty(taskId: number, difficultyData: CreateDifficultyRequest): Observable<ApiResponse<TaskDifficulty>> {
    this.loggingService.debug('Reporting difficulty for task', {
      component: 'TasksApiService',
      action: 'reportDifficulty',
      data: { taskId, type: difficultyData.type, severity: difficultyData.severity }
    });

    return this.apiService.post<ApiResponse<TaskDifficulty>>(`/tasks/${taskId}/difficulties`, difficultyData)
      .pipe(
        tap(() => {
          this.loggingService.info('Difficulty reported successfully', {
            component: 'TasksApiService',
            action: 'reportDifficulty',
            data: { taskId, type: difficultyData.type }
          });
        }),
        catchError(error => {
          this.loggingService.error('Failed to report difficulty', {
            component: 'TasksApiService',
            action: 'reportDifficulty',
            data: { error: error.message, taskId }
          });
          throw error;
        })
      );
  }

  /**
   * Résoudre une difficulté
   */
  resolveDifficulty(difficultyId: number, resolutionData: ResolveDifficultyRequest): Observable<ApiResponse<TaskDifficulty>> {
    return this.apiService.put<ApiResponse<TaskDifficulty>>(`/difficulties/${difficultyId}`, resolutionData);
  }

  // ========================================
  // HISTORIQUE ET AUDIT
  // ========================================

  /**
   * Obtenir l'historique des modifications d'une tâche
   */
  getTaskHistory(taskId: number): Observable<ApiResponse<TaskHistory[]>> {
    return this.apiService.get<ApiResponse<TaskHistory[]>>(`/tasks/${taskId}/history`);
  }

  // ========================================
  // VUES PERSONNALISÉES
  // ========================================

  /**
   * Obtenir les vues sauvegardées d'un utilisateur
   */
  getUserTaskViews(userId: number): Observable<ApiResponse<TaskView[]>> {
    return this.apiService.get<ApiResponse<TaskView[]>>(`/users/${userId}/task-views`);
  }

  /**
   * Sauvegarder une vue personnalisée
   */
  saveTaskView(userId: number, viewData: SaveTaskViewRequest): Observable<ApiResponse<TaskView>> {
    return this.apiService.post<ApiResponse<TaskView>>(`/users/${userId}/task-views`, viewData);
  }

  /**
   * Modifier une vue personnalisée
   */
  updateTaskView(viewId: number, viewData: Partial<SaveTaskViewRequest>): Observable<ApiResponse<TaskView>> {
    return this.apiService.put<ApiResponse<TaskView>>(`/task-views/${viewId}`, viewData);
  }

  /**
   * Supprimer une vue personnalisée
   */
  deleteTaskView(viewId: number): Observable<ApiResponse<void>> {
    return this.apiService.delete<ApiResponse<void>>(`/task-views/${viewId}`);
  }

  // ========================================
  // TIME TRACKING - SAISIES
  // ========================================

  /**
   * Saisir du temps sur une tâche
   */
  addTimeEntry(taskId: number, timeData: CreateTimeEntryRequest): Observable<ApiResponse<TaskTimeEntry>> {
    this.loggingService.debug('Adding time entry to task', {
      component: 'TasksApiService',
      action: 'addTimeEntry',
      data: { taskId, hours: timeData.hours }
    });

    return this.apiService.post<ApiResponse<TaskTimeEntry>>(`/tasks/${taskId}/time-entries`, timeData)
      .pipe(
        tap(() => {
          this.loggingService.info('Time entry added successfully', {
            component: 'TasksApiService',
            action: 'addTimeEntry',
            data: { taskId, hours: timeData.hours }
          });
        }),
        catchError(error => {
          this.loggingService.error('Failed to add time entry', {
            component: 'TasksApiService',
            action: 'addTimeEntry',
            data: { error: error.message, taskId }
          });
          throw error;
        })
      );
  }

  /**
   * Lister les saisies de temps d'une tâche
   */
  getTaskTimeEntries(taskId: number): Observable<ApiResponse<TaskTimeEntry[]>> {
    return this.apiService.get<ApiResponse<TaskTimeEntry[]>>(`/tasks/${taskId}/time-entries`);
  }

  /**
   * Modifier une saisie de temps
   */
  updateTimeEntry(entryId: number, timeData: Partial<CreateTimeEntryRequest>): Observable<ApiResponse<TaskTimeEntry>> {
    return this.apiService.put<ApiResponse<TaskTimeEntry>>(`/time-entries/${entryId}`, timeData);
  }

  /**
   * Supprimer une saisie de temps
   */
  deleteTimeEntry(entryId: number): Observable<ApiResponse<void>> {
    return this.apiService.delete<ApiResponse<void>>(`/time-entries/${entryId}`);
  }

  /**
   * Démarrer une session de temps
   */
  startTimeSession(taskId: number, sessionData?: StartTimeSessionRequest): Observable<ApiResponse<TimeSession>> {
    this.loggingService.debug('Starting time session', {
      component: 'TasksApiService',
      action: 'startTimeSession',
      data: { taskId }
    });

    return this.apiService.post<ApiResponse<TimeSession>>(`/tasks/${taskId}/time/start`, sessionData || {})
      .pipe(
        tap(response => {
          if (response.data) {
            this.currentTimeSessionSubject.next(response.data);
          }
          this.loggingService.info('Time session started successfully', {
            component: 'TasksApiService',
            action: 'startTimeSession',
            data: { taskId, sessionId: response.data?.id }
          });
        }),
        catchError(error => {
          this.loggingService.error('Failed to start time session', {
            component: 'TasksApiService',
            action: 'startTimeSession',
            data: { error: error.message, taskId }
          });
          throw error;
        })
      );
  }

  /**
   * Arrêter une session de temps
   */
  stopTimeSession(entryId: number): Observable<ApiResponse<TaskTimeEntry>> {
    this.loggingService.debug('Stopping time session', {
      component: 'TasksApiService',
      action: 'stopTimeSession',
      data: { entryId }
    });

    return this.apiService.put<ApiResponse<TaskTimeEntry>>(`/time-entries/${entryId}/stop`, {})
      .pipe(
        tap(() => {
          this.currentTimeSessionSubject.next(null);
          this.loggingService.info('Time session stopped successfully', {
            component: 'TasksApiService',
            action: 'stopTimeSession',
            data: { entryId }
          });
        }),
        catchError(error => {
          this.loggingService.error('Failed to stop time session', {
            component: 'TasksApiService',
            action: 'stopTimeSession',
            data: { error: error.message, entryId }
          });
          throw error;
        })
      );
  }

  /**
   * Obtenir la session de temps actuelle
   */
  getCurrentTimeSession(): Observable<ApiResponse<TimeSession | null>> {
    return this.apiService.get<ApiResponse<TimeSession | null>>('/time/current-session')
      .pipe(
        tap(response => {
          this.currentTimeSessionSubject.next(response.data || null);
        })
      );
  }

  /**
   * Charger la session de temps actuelle au démarrage
   */
  private loadCurrentTimeSession(): void {
    this.getCurrentTimeSession().subscribe({
      next: () => {}, // Session mise à jour via tap
      error: (error) => {
        this.loggingService.error('Failed to load current time session', {
          component: 'TasksApiService',
          action: 'loadCurrentTimeSession',
          data: { error: error.message }
        });
      }
    });
  }

  // ========================================
  // TIME TRACKING - CONSULTATIONS
  // ========================================

  /**
   * Obtenir le résumé temps d'une tâche
   */
  getTaskTimeSummary(taskId: number): Observable<ApiResponse<TaskSummary>> {
    return this.apiService.get<ApiResponse<TaskSummary>>(`/tasks/${taskId}/time-summary`);
  }

  /**
   * Obtenir mes saisies de temps
   */
  getMyTimeEntries(params?: {
    task_id?: number;
    date_from?: string;
    date_to?: string;
  }): Observable<ApiResponse<TaskTimeEntry[]>> {
    return this.apiService.get<ApiResponse<TaskTimeEntry[]>>('/time/my-sessions', { params });
  }

  // ========================================
  // MÉTHODES UTILITAIRES
  // ========================================

  /**
   * Construire les paramètres de filtre pour les tâches
   */
  private buildTaskFilters(filters?: TaskFilters): any {
    if (!filters) return {};

    const params: any = {};

    // Pagination
    if (filters.page) params.page = filters.page;
    if (filters.per_page) params.per_page = filters.per_page;

    // Filtres de base
    if (filters.project_id) params.project_id = filters.project_id;
    if (filters.assigned_to) params.assigned_to = filters.assigned_to;
    if (filters.type) params.type = filters.type;
    if (filters.search) params.search = filters.search;
    if (filters.due_date_from) params.due_date_from = filters.due_date_from;
    if (filters.due_date_to) params.due_date_to = filters.due_date_to;
    if (filters.overdue !== undefined) params.overdue = filters.overdue;
    if (filters.my_tasks !== undefined) params.my_tasks = filters.my_tasks;

    // Filtres multiples
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        params.status = filters.status.join(',');
      } else {
        params.status = filters.status;
      }
    }

    if (filters.priority) {
      if (Array.isArray(filters.priority)) {
        params.priority = filters.priority.join(',');
      } else {
        params.priority = filters.priority;
      }
    }

    if (filters.tags && filters.tags.length > 0) {
      params.tags = filters.tags.join(',');
    }

    // Tri
    if (filters.sort_by) params.sort_by = filters.sort_by;
    if (filters.sort_direction) params.sort_direction = filters.sort_direction;

    // Inclusions
    if (filters.include) params.include = filters.include;

    return params;
  }

  /**
   * Rafraîchir la tâche courante
   */
  refreshCurrentTask(): void {
    const currentTask = this.currentTaskSubject.value;
    if (currentTask) {
      this.getTask(currentTask.id, 'project,assignees,tags,comments,files,time_entries,difficulties')
        .subscribe(); // La mise à jour se fait via tap dans getTask
    }
  }

  /**
   * Nettoyer l'état
   */
  clearState(): void {
    this.currentTaskSubject.next(null);
    this.currentTimeSessionSubject.next(null);
  }
}