// ========================================
// MODÈLES COMPLETS POUR LA GESTION DES TÂCHES
// Basé sur DOCUMENTATION_INTEGRATION_API.md
// ========================================

import { UserEntity } from '../../../domain/entities/user.entity';
import { Project } from '../../projects/models/project.models';

// ========================================
// ÉNUMÉRATIONS
// ========================================

export enum TaskStatus {
  A_FAIRE = 'a_faire',
  EN_COURS = 'en_cours',
  BLOQUE = 'bloque',
  TEST = 'test',
  TERMINE = 'termine'
}

export enum TaskPriority {
  BASSE = 'basse',
  NORMALE = 'normale',
  HAUTE = 'haute',
  CRITIQUE = 'critique'
}

export enum TaskType {
  DEV = 'dev',
  DESIGN = 'design',
  TEST = 'test',
  ANALYSE = 'analyse',
  AUTRE = 'autre'
}

export enum DifficultyType {
  TECHNICAL = 'technical',
  RESOURCE = 'resource',
  EXTERNAL = 'external',
  OTHER = 'other'
}

export enum DifficultySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum DifficultyStatus {
  OPEN = 'open',
  RESOLVED = 'resolved'
}

// ========================================
// INTERFACES PRINCIPALES - TÂCHES
// ========================================

export interface Task {
  id: number;
  code: string;
  project_id: number;
  parent_task_id?: number;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
  estimated_hours?: number;
  actual_hours?: number;
  progress_percentage: number;
  due_date?: string;
  created_by: number;
  updated_by?: number;
  created_at: string;
  updated_at: string;

  // Relations
  project?: Project;
  creator?: UserEntity;
  parent_task?: Task;
  assignees?: TaskAssignment[];
  tags?: TaskTag[];
  comments?: TaskComment[];
  files?: TaskFile[];
  time_entries?: TaskTimeEntry[];
  difficulties?: TaskDifficulty[];
  history?: TaskHistory[];

  // Propriétés calculées
  comments_count?: number;
  files_count?: number;
  time_entries_count?: number;
  difficulties_count?: number;
  is_overdue?: boolean;
  days_until_due?: number;
}

export interface TaskAssignment {
  id: number;
  task_id: number;
  user_id: number;
  assigned_at: string;
  assigned_by: number;

  // Relations
  user: UserEntity;
  assigner?: UserEntity;
}

export interface TaskTag {
  id: number;
  name: string;
  color: string;
  description?: string;
}

// ========================================
// INTERFACES - COMMENTAIRES
// ========================================

export interface TaskComment {
  id: number;
  task_id: number;
  user_id: number;
  content: string;
  mentions?: number[];
  is_edited: boolean;
  created_at: string;
  updated_at: string;

  // Relations
  user: UserEntity;
  mentioned_users?: UserEntity[];
}

// ========================================
// INTERFACES - FICHIERS
// ========================================

export interface TaskFile {
  id: number;
  task_id: number;
  user_id: number;
  name: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  description?: string;
  created_at: string;

  // Relations
  user: UserEntity;

  // Propriétés calculées
  download_url?: string;
  file_size_human?: string;
}

// ========================================
// INTERFACES - TIME TRACKING
// ========================================

export interface TaskTimeEntry {
  id: number;
  task_id: number;
  user_id: number;
  start_time: string;
  end_time?: string;
  hours: number;
  description?: string;
  is_paused: boolean;
  created_at: string;
  updated_at: string;

  // Relations
  task?: Task;
  user?: UserEntity;
}

export interface TimeSession {
  id: number;
  task_id: number;
  user_id: number;
  start_time: string;
  end_time?: string;
  description?: string;
  is_active: boolean;
}

// ========================================
// INTERFACES - DIFFICULTÉS
// ========================================

export interface TaskDifficulty {
  id: number;
  task_id: number;
  user_id: number;
  type: DifficultyType;
  description: string;
  severity: DifficultySeverity;
  proposed_solution?: string;
  status: DifficultyStatus;
  resolved_at?: string;
  resolved_by?: number;
  resolution?: string;
  created_at: string;

  // Relations
  user: UserEntity;
  resolver?: UserEntity;
}

// ========================================
// INTERFACES - HISTORIQUE
// ========================================

export interface TaskHistory {
  id: number;
  task_id: number;
  action: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  user_id: number;
  created_at: string;

  // Relations
  user: UserEntity;
}

// ========================================
// INTERFACES - VUES PERSONNALISÉES
// ========================================

export interface TaskView {
  id: number;
  user_id: number;
  name: string;
  filters: TaskFilters;
  sort_by: string;
  sort_direction: 'asc' | 'desc';
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// ========================================
// INTERFACES - REQUÊTES API
// ========================================

export interface CreateTaskRequest {
  title: string;
  description?: string;
  parent_task_id?: number;
  priority?: TaskPriority;
  type?: TaskType;
  estimated_hours?: number;
  due_date?: string;
  assigned_users?: number[];
  tags?: number[];
  status?: TaskStatus;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  type?: TaskType;
  estimated_hours?: number;
  due_date?: string;
  status?: TaskStatus;
}

export interface UpdateTaskStatusRequest {
  status: TaskStatus;
  comment?: string;
}

export interface AssignTaskRequest {
  user_ids: number[];
  notify?: boolean;
  message?: string;
}

export interface CreateCommentRequest {
  content: string;
  mentions?: number[];
  notify_assignees?: boolean;
}

export interface UpdateCommentRequest {
  content: string;
}

export interface CreateTimeEntryRequest {
  date: string;
  hours: number;
  description?: string;
  start_time?: string;
  end_time?: string;
}

export interface StartTimeSessionRequest {
  description?: string;
}

export interface CreateDifficultyRequest {
  type: DifficultyType;
  description: string;
  severity: DifficultySeverity;
  proposed_solution?: string;
}

export interface ResolveDifficultyRequest {
  status: DifficultyStatus;
  resolution?: string;
  resolved_by?: number;
}

export interface CreateTaskTagRequest {
  name: string;
  color: string;
  description?: string;
}

export interface SaveTaskViewRequest {
  name: string;
  filters: TaskFilters;
  sort_by: string;
  sort_direction: 'asc' | 'desc';
  is_default?: boolean;
}

// ========================================
// INTERFACES - FILTRES ET RECHERCHE
// ========================================

export interface TaskFilters {
  page?: number;
  per_page?: number;
  project_id?: number;
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority | TaskPriority[];
  assigned_to?: number;
  type?: TaskType;
  tags?: number[];
  search?: string;
  due_date_from?: string;
  due_date_to?: string;
  overdue?: boolean;
  my_tasks?: boolean;
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
  include?: string;
  assigned_to_me?: boolean;
  due_within_days?: number;
}

// ========================================
// INTERFACES - RÉPONSES API
// ========================================

export interface TaskStatusOption {
  value: TaskStatus;
  label: string;
  color: string;
  description: string;
}

export interface TaskSummary {
  estimated_hours?: number;
  actual_hours?: number;
  variance?: number;
  progress_percentage: number;
  progress_color: string;
  time_by_user?: UserTimeBreakdown[];
  daily_breakdown?: { [date: string]: number };
}

export interface UserTimeBreakdown {
  user: UserEntity;
  total_hours: number;
  entries_count: number;
}

export interface ProjectTimeAnalytics {
  time_evolution: { [date: string]: number };
  cumulative_time: { [date: string]: number };
  user_distribution: { [userName: string]: { hours: number; percentage: number } };
  task_type_distribution: { [type: string]: { hours: number; percentage: number } };
  productivity_metrics: {
    average_hours_per_task: number;
    tasks_completed: number;
    tasks_in_progress: number;
    efficiency_ratio: number;
  };
}

export interface UserTimeSummary {
  total_hours: number;
  total_days: number;
  average_hours_per_day: number;
  by_project: { [projectName: string]: number };
  by_type: { [type: string]: number };
  efficiency_metrics: {
    tasks_completed: number;
    average_time_per_task: number;
  };
}

// ========================================
// CONSTANTES ET LABELS
// ========================================

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  [TaskStatus.A_FAIRE]: 'À faire',
  [TaskStatus.EN_COURS]: 'En cours',
  [TaskStatus.BLOQUE]: 'Bloqué',
  [TaskStatus.TEST]: 'En test',
  [TaskStatus.TERMINE]: 'Terminé'
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  [TaskStatus.A_FAIRE]: '#6b7280',
  [TaskStatus.EN_COURS]: '#3b82f6',
  [TaskStatus.BLOQUE]: '#f59e0b',
  [TaskStatus.TEST]: '#8b5cf6',
  [TaskStatus.TERMINE]: '#10b981'
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  [TaskPriority.BASSE]: 'Basse',
  [TaskPriority.NORMALE]: 'Normale',
  [TaskPriority.HAUTE]: 'Haute',
  [TaskPriority.CRITIQUE]: 'Critique'
};

export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  [TaskPriority.BASSE]: '#6b7280',
  [TaskPriority.NORMALE]: '#3b82f6',
  [TaskPriority.HAUTE]: '#f59e0b',
  [TaskPriority.CRITIQUE]: '#ef4444'
};

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  [TaskType.DEV]: 'Développement',
  [TaskType.DESIGN]: 'Design',
  [TaskType.TEST]: 'Test',
  [TaskType.ANALYSE]: 'Analyse',
  [TaskType.AUTRE]: 'Autre'
};

export const DIFFICULTY_TYPE_LABELS: Record<DifficultyType, string> = {
  [DifficultyType.TECHNICAL]: 'Technique',
  [DifficultyType.RESOURCE]: 'Ressource',
  [DifficultyType.EXTERNAL]: 'Externe',
  [DifficultyType.OTHER]: 'Autre'
};

export const DIFFICULTY_SEVERITY_LABELS: Record<DifficultySeverity, string> = {
  [DifficultySeverity.LOW]: 'Faible',
  [DifficultySeverity.MEDIUM]: 'Moyen',
  [DifficultySeverity.HIGH]: 'Élevé',
  [DifficultySeverity.CRITICAL]: 'Critique'
};

export const DIFFICULTY_SEVERITY_COLORS: Record<DifficultySeverity, string> = {
  [DifficultySeverity.LOW]: '#10b981',
  [DifficultySeverity.MEDIUM]: '#f59e0b',
  [DifficultySeverity.HIGH]: '#ef4444',
  [DifficultySeverity.CRITICAL]: '#dc2626'
};

// ========================================
// FONCTIONS UTILITAIRES
// ========================================

export function getTaskProgressColor(percentage: number): string {
  if (percentage >= 80) return '#10b981';
  if (percentage >= 60) return '#3b82f6';
  if (percentage >= 40) return '#f59e0b';
  return '#ef4444';
}

export function isTaskOverdue(task: Task): boolean {
  if (!task.due_date) return false;
  const today = new Date();
  const dueDate = new Date(task.due_date);
  return today > dueDate && task.status !== TaskStatus.TERMINE;
}

export function getDaysUntilDue(task: Task): number | null {
  if (!task.due_date) return null;
  const today = new Date();
  const dueDate = new Date(task.due_date);
  const diffTime = dueDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function formatDuration(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)}min`;
  }
  return `${hours.toFixed(1)}h`;
}

export function getFileIcon(mimeType: string): string {
  if (mimeType.includes('image')) return 'image';
  if (mimeType.includes('pdf')) return 'picture_as_pdf';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'description';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'grid_on';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'slideshow';
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return 'archive';
  return 'insert_drive_file';
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function canEditTask(task: Task, currentUser: UserEntity): boolean {
  // Peut éditer si c'est le créateur ou s'il est assigné à la tâche
  if (task.created_by.toString() === currentUser.id) return true;
  return task.assignees?.some(assignment =>
    assignment.user_id.toString() === currentUser.id
  ) || false;
}

export function canDeleteComment(comment: TaskComment, currentUser: UserEntity): boolean {
  return comment.user_id.toString() === currentUser.id;
}

export function canEditComment(comment: TaskComment, currentUser: UserEntity): boolean {
  if (comment.user_id.toString() !== currentUser.id) return false;
  // Peut éditer dans les 15 minutes
  const commentTime = new Date(comment.created_at).getTime();
  const now = new Date().getTime();
  const diffMinutes = (now - commentTime) / (1000 * 60);
  return diffMinutes <= 15;
}