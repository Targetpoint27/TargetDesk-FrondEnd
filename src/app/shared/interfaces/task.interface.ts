// ========================================
// INTERFACES ET MODÈLES POUR TÂCHES
// Basé sur la documentation API complète
// ========================================

import { UserEntity } from '../../domain/entities/user.entity';
import { Project } from '../../features/projects/models/project.models';

export interface TaskTag {
  id: number;
  name: string;
  color: string;
  description?: string;
}

export interface TaskAssignee {
  id: number;
  name: string;
  email: string;
  pivot: {
    assigned_at: string;
    assigned_by: number;
  };
}

export interface TaskComment {
  id: number;
  task_id: number;
  user_id: number;
  content: string;
  mentions: number[];
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  user: UserEntity;
  mentioned_users: UserEntity[];
}

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
  user: UserEntity;
  download_url: string;
  file_size_human: string;
}

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
  task: {
    id: number;
    title: string;
    code: string;
  };
  user: UserEntity;
}

export interface TaskDifficulty {
  id: number;
  task_id: number;
  user_id: number;
  type: 'technical' | 'resource' | 'external' | 'other';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  proposed_solution?: string;
  status: 'open' | 'resolved';
  resolved_at?: string;
  resolved_by?: number;
  resolution?: string;
  created_at: string;
  user: UserEntity;
  resolver?: UserEntity;
}

export interface TaskHistory {
  id: number;
  action: string;
  field_name: string;
  old_value: any;
  new_value: any;
  user: UserEntity;
  created_at: string;
}

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
  project: Project;
  creator: UserEntity;
  assignees: TaskAssignee[];
  assigned_users?: any[]; // Alternative naming from API
  tags: TaskTag[];

  // Compteurs
  comments_count: number;
  files_count: number;
  time_entries_count: number;
  difficulties_count: number;

  // Flags utiles
  is_overdue: boolean;
  days_until_due?: number;

  // Relations chargées optionnellement
  comments?: TaskComment[];
  files?: TaskFile[];
  time_entries?: TaskTimeEntry[];
  difficulties?: TaskDifficulty[];
  history?: TaskHistory[];
}

export type TaskStatus = 'a_faire' | 'en_cours' | 'bloque' | 'test' | 'termine';
export type TaskPriority = 'basse' | 'normale' | 'haute' | 'critique';
export type TaskType = 'dev' | 'design' | 'test' | 'analyse' | 'autre';

export interface TaskStatusOption {
  value: TaskStatus;
  label: string;
  color: string;
  description: string;
}

export interface TaskFilters {
  page?: number;
  per_page?: number;
  project_id?: number;
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority | TaskPriority[];
  assigned_to?: number;
  type?: TaskType | TaskType[];
  tags?: number[];
  search?: string;
  due_date_from?: string;
  due_date_to?: string;
  overdue?: boolean;
  my_tasks?: boolean;
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
  include?: string[];
}

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
  parent_task_id?: number;
  priority?: TaskPriority;
  type?: TaskType;
  estimated_hours?: number;
  due_date?: string;
  assigned_users?: number[];
  tags?: number[];
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

export interface CreateDifficultyRequest {
  type: 'technical' | 'resource' | 'external' | 'other';
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  proposed_solution?: string;
}

export interface ResolveDifficultyRequest {
  status: 'resolved';
  resolution: string;
  resolved_by: number;
}

export interface CreateTimeEntryRequest {
  date: string;
  hours: number;
  description?: string;
  start_time?: string;
  end_time?: string;
}

export interface StartTimeTrackingRequest {
  description?: string;
}

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

export interface CreateTaskViewRequest {
  name: string;
  filters: TaskFilters;
  sort_by: string;
  sort_direction: 'asc' | 'desc';
  is_default?: boolean;
}

export interface PaginatedTaskResponse {
  data: Task[];
  meta: {
    current_page: number;
    total: number;
    per_page: number;
    last_page: number;
    from: number;
    to: number;
  };
}

export interface ApiTaskResponse {
  success: boolean;
  data: {
    current_page: number;
    data: Task[];
    first_page_url: string;
    from: number;
    last_page: number;
    last_page_url: string;
    links: any[];
    next_page_url: string | null;
    path: string;
    per_page: string;
    prev_page_url: string | null;
    to: number;
    total: number;
  };
  message: string;
}

export interface TaskTimeSummary {
  estimated_hours: number;
  actual_hours: number;
  variance: number;
  progress_percentage: number;
  progress_color: string;
  time_by_user: Array<{
    user: UserEntity;
    total_hours: number;
    entries_count: number;
  }>;
  daily_breakdown: Record<string, number>;
}

export interface TimeReport {
  total_hours: number;
  total_days: number;
  average_hours_per_day: number;
  by_project: Record<string, number>;
  by_type: Record<string, number>;
  efficiency_metrics: {
    tasks_completed: number;
    average_time_per_task: number;
  };
}

export interface CurrentTimeSession {
  id?: number;
  task_id?: number;
  user_id?: number;
  start_time?: string;
  description?: string;
  task?: {
    id: number;
    title: string;
    code: string;
  };
}

// Constants pour les options
export const TASK_STATUS_OPTIONS: TaskStatusOption[] = [
  {
    value: 'a_faire',
    label: 'À faire',
    color: '#6b7280',
    description: 'Tâche prête à être démarrée'
  },
  {
    value: 'en_cours',
    label: 'En cours',
    color: '#3b82f6',
    description: 'Tâche en cours de réalisation'
  },
  {
    value: 'bloque',
    label: 'Bloqué',
    color: '#f59e0b',
    description: 'Tâche bloquée par une difficulté'
  },
  {
    value: 'test',
    label: 'En test',
    color: '#8b5cf6',
    description: 'Tâche en phase de test'
  },
  {
    value: 'termine',
    label: 'Terminé',
    color: '#10b981',
    description: 'Tâche complètement terminée'
  }
];

export const TASK_PRIORITY_OPTIONS = [
  { value: 'basse', label: 'Basse', color: '#6b7280' },
  { value: 'normale', label: 'Normale', color: '#3b82f6' },
  { value: 'haute', label: 'Haute', color: '#f59e0b' },
  { value: 'critique', label: 'Critique', color: '#ef4444' }
];

export const TASK_TYPE_OPTIONS = [
  { value: 'dev', label: 'Développement', icon: '' },
  { value: 'design', label: 'Design', icon: '' },
  { value: 'test', label: 'Test', icon: '' },
  { value: 'analyse', label: 'Analyse', icon: '' },
  { value: 'autre', label: 'Autre', icon: '' }
];