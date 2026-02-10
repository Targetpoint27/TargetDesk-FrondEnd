// ========================================
// MODÈLES POUR LA GESTION DE PROJETS
// Basé sur GESTION_PROJETS_API_DOCUMENTATION.md
// ========================================

import { UserEntity } from '../../../domain/entities/user.entity';
import { ClientEntity } from '../../../domain/entities/client.entity';

// ========================================
// ÉNUMÉRATIONS
// ========================================

export enum ProjectStatus {
  EN_COURS = 'en_cours',
  EN_ATTENTE = 'en_attente',
  EN_DANGER = 'en_danger',
  TERMINE = 'termine',
  ANNULE = 'annule'
}

export enum ProjectProfitabilityIndicator {
  GREEN = 'green',
  ORANGE = 'orange',
  RED = 'red'
}

export enum ProjectRiskIndicator {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export enum ProjectClientType {
  INTERNE = 'interne',
  EXTERNE = 'externe'
}

export enum TeamRole {
  DEVELOPPEUR = 'developeur',
  DESIGNER = 'designer',
  TESTEUR = 'testeur',
  ANALYSTE = 'analyste',
  AUTRE = 'autre'
}

export enum TaskStatus {
  EN_COURS = 'en_cours',
  EN_ATTENTE = 'en_attente',
  EN_DANGER = 'en_danger',
  TERMINE = 'termine',
  ANNULE = 'annule'
}

export enum TaskPriority {
  HAUTE = 'haute',
  MOYENNE = 'moyenne',
  BASSE = 'basse'
}

// ========================================
// INTERFACES PRINCIPALES
// ========================================

export interface ExternalClientInfo {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
}

export interface Project {
  id: number;
  name: string;
  code: string;
  description?: string;
  objectives?: string;
  estimated_budget?: number;
  actual_budget?: number;
  start_date: string;
  planned_end_date: string;
  actual_end_date?: string;
  status: ProjectStatus;
  progress_percentage: number;
  profitability_indicator?: ProjectProfitabilityIndicator;
  risk_indicator: ProjectRiskIndicator;
  client_type?: ProjectClientType;
  client_id?: number;
  external_client_info?: ExternalClientInfo;
  project_manager_id: number;
  department: string;
  created_by: number;
  updated_by: number;
  created_at: string;
  updated_at: string;

  // Relations
  project_manager?: UserEntity;
  client?: ClientEntity;
  client_info?: ExternalClientInfo | ClientEntity;
  team_members?: ProjectTeamMember[];
  histories?: ProjectHistory[];

  // Propriétés calculées
  progress_color?: string;
  days_remaining?: number;
  is_overdue?: boolean;
}

export interface ProjectTeamMember {
  id: number;
  project_id: number;
  user_id: number;
  role: TeamRole;
  hourly_rate?: number;
  is_active: boolean;
  added_by: number;
  joined_at: string;
  left_at?: string;
  created_at: string;
  updated_at: string;
  user: UserEntity;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  status: TaskStatus;
  priority?: TaskPriority;
  assigned_to_user?: UserEntity;
  assigned_to_user_id?: number;
  project_id: number;
  due_date?: string;
  completed_at?: string;
  estimated_hours?: number;
  actual_hours?: number;
  progress_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectHistory {
  id: number;
  project_id: number;
  action_type: string;
  field_changed?: string;
  old_value?: string;
  new_value?: string;
  comment?: string;
  metadata?: any;
  changed_by: number;
  created_at: string;
  updated_at: string;
  changed_by_user?: UserEntity;
}

// ========================================
// INTERFACES POUR LES REQUÊTES API
// ========================================

export interface CreateProjectRequest {
  name: string;
  department: string;
  project_manager_id: number;
  start_date: string;
  planned_end_date: string;
  description?: string;
  objectives?: string;
  estimated_budget?: number;
  risk_indicator?: ProjectRiskIndicator;
  client_type?: ProjectClientType;
  client_id?: number;
  external_client_info?: ExternalClientInfo;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  objectives?: string;
  estimated_budget?: number;
  planned_end_date?: string;
  project_manager_id?: number;
  department?: string;
  client_type?: ProjectClientType;
  client_id?: number;
  external_client_info?: ExternalClientInfo;
  risk_indicator?: ProjectRiskIndicator;
}

export interface AddTeamMemberRequest {
  user_id: number;
  role: TeamRole;
  hourly_rate?: number;
}

export interface UpdateProgressRequest {
  progress_percentage: number;
}

export interface UpdateStatusRequest {
  status: ProjectStatus;
  comment?: string;
}

export interface ProjectFilters {
  my_projects?: boolean;
  status?: string;
  active_only?: boolean;
  department?: string;
  per_page?: number;
  page?: number;
  search?: string;
}

// ========================================
// INTERFACES POUR LES RÉPONSES API
// ========================================

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface PaginatedProjectResponse {
  success: boolean;
  data: Project[];
  meta: {
    current_page: number;
    total: number;
    per_page: number;
    last_page: number;
  };
}

export interface ProjectStatistics {
  total_projects: number;
  active_projects: number;
  completed_projects: number;
  cancelled_projects: number;
  projects_by_status: Record<ProjectStatus, number>;
  projects_by_department: Record<string, number>;
  average_progress: number;
  at_risk_projects: number;
}

export interface ProjectProgress {
  progress_percentage: number;
  progress_color: string;
  calculated_progress: number;
}

// ========================================
// NOUVELLES INTERFACES POUR LES ENDPOINTS MANQUANTS
// ========================================

export interface ProjectTimeline {
  id: number;
  project_id: number;
  milestone_name: string;
  milestone_description?: string;
  planned_date: string;
  actual_date?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'delayed';
  completion_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectStats {
  project_id: number;
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  in_progress_tasks: number;
  blocked_tasks: number;
  tasks_completion_rate: number;
  total_estimated_hours: number;
  total_actual_hours: number;
  time_variance: number;
  team_members_count: number;
  active_team_members_count: number;
  budget_usage_percentage: number;
  health_score: number;
  risk_level: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
}

export interface ProjectTimeSummary {
  project_id: number;
  total_hours_logged: number;
  total_estimated_hours: number;
  variance_hours: number;
  variance_percentage: number;
  average_hours_per_day: number;
  peak_hours_day: string;
  peak_hours_amount: number;
  time_by_user: {
    user: UserEntity;
    total_hours: number;
    percentage_contribution: number;
  }[];
  time_by_task_type: {
    type: string;
    total_hours: number;
    percentage_contribution: number;
  }[];
  daily_breakdown: {
    date: string;
    total_hours: number;
    unique_users: number;
  }[];
  efficiency_metrics: {
    planned_vs_actual_ratio: number;
    productivity_score: number;
    quality_indicator: number;
  };
}

export interface ProjectTimeEntry {
  id: number;
  project_id: number;
  task_id: number;
  user_id: number;
  date: string;
  start_time?: string;
  end_time?: string;
  hours: number;
  description: string;
  billable: boolean;
  task?: Task;
  user?: UserEntity;
  created_at: string;
  updated_at: string;
}

export interface ProjectTimeAnalytics {
  project_id: number;
  analysis_period: {
    start_date: string;
    end_date: string;
  };
  time_distribution: {
    development: number;
    design: number;
    testing: number;
    management: number;
    other: number;
  };
  productivity_trends: {
    date: string;
    hours_logged: number;
    productivity_score: number;
    efficiency_rating: number;
  }[];
  team_performance: {
    user: UserEntity;
    total_hours: number;
    average_daily_hours: number;
    productivity_score: number;
    quality_metrics: {
      tasks_completed: number;
      bugs_introduced: number;
      code_review_score: number;
    };
  }[];
  bottlenecks: {
    task_type: string;
    avg_completion_time: number;
    complexity_factor: number;
    resource_demand: number;
  }[];
  forecasting: {
    estimated_completion_date: string;
    confidence_level: number;
    resource_requirements: {
      role: string;
      estimated_hours: number;
    }[];
  };
}

// ========================================
// CONSTANTES ET LABELS
// ========================================

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  [ProjectStatus.EN_COURS]: 'En cours',
  [ProjectStatus.EN_ATTENTE]: 'En attente',
  [ProjectStatus.EN_DANGER]: 'En danger',
  [ProjectStatus.TERMINE]: 'Terminé',
  [ProjectStatus.ANNULE]: 'Annulé'
};

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  [ProjectStatus.EN_COURS]: 'success',
  [ProjectStatus.EN_ATTENTE]: 'warning',
  [ProjectStatus.EN_DANGER]: 'danger',
  [ProjectStatus.TERMINE]: 'info',
  [ProjectStatus.ANNULE]: 'secondary'
};

export const RISK_LEVEL_LABELS: Record<ProjectRiskIndicator, string> = {
  [ProjectRiskIndicator.LOW]: 'Faible',
  [ProjectRiskIndicator.MEDIUM]: 'Moyen',
  [ProjectRiskIndicator.HIGH]: 'Élevé'
};

export const RISK_LEVEL_COLORS: Record<ProjectRiskIndicator, string> = {
  [ProjectRiskIndicator.LOW]: 'success',
  [ProjectRiskIndicator.MEDIUM]: 'warning',
  [ProjectRiskIndicator.HIGH]: 'danger'
};

export const TEAM_ROLE_LABELS: Record<TeamRole, string> = {
  [TeamRole.DEVELOPPEUR]: 'Développeur',
  [TeamRole.DESIGNER]: 'Designer',
  [TeamRole.TESTEUR]: 'Testeur',
  [TeamRole.ANALYSTE]: 'Analyste',
  [TeamRole.AUTRE]: 'Autre'
};

export const CLIENT_TYPE_LABELS: Record<ProjectClientType, string> = {
  [ProjectClientType.INTERNE]: 'Client interne',
  [ProjectClientType.EXTERNE]: 'Client externe'
};

// ========================================
// FONCTIONS UTILITAIRES
// ========================================

export function getProgressConfig(percentage: number): { color: string; label: string } {
  if (percentage >= 76) return { color: 'success', label: 'Excellent' };
  if (percentage >= 50) return { color: 'warning', label: 'En cours' };
  return { color: 'danger', label: 'En retard' };
}

export function getDaysRemaining(endDate: string): number {
  const today = new Date();
  const end = new Date(endDate);
  const diffTime = end.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function isProjectOverdue(project: Project): boolean {
  const today = new Date();
  const endDate = new Date(project.planned_end_date);
  return today > endDate && project.status !== ProjectStatus.TERMINE;
}

export function canEditProject(project: Project, currentUser: UserEntity): boolean {
  // Note: UserEntity n'a pas de propriété roles, donc on vérifie seulement si c'est le chef de projet
  // TODO: Ajouter la logique de rôles quand elle sera disponible
  return project.project_manager_id.toString() === currentUser.id;
}

export function formatProjectDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('fr-FR');
}