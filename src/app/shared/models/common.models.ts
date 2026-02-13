// ========================================
// MODÈLES COMMUNS PARTAGÉS
// Types de base utilisés dans toute l'application
// ========================================

// ========================================
// INTERFACES DE BASE
// ========================================

export interface BaseEntity {
  id: number;
  created_at?: string;
  updated_at?: string;
}

export interface TimestampedEntity extends BaseEntity {
  created_at: string;
  updated_at: string;
}

// ========================================
// INTERFACES DE REQUÊTE API
// ========================================

export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  status: 'success' | 'error';
  errors?: string[];
}

export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export interface ApiFilters {
  page?: number;
  per_page?: number;
  search?: string;
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
}

// ========================================
// ÉNUMÉRATIONS COMMUNES
// ========================================

export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc'
}

export enum Status {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

// ========================================
// TYPES UTILITAIRES
// ========================================

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type SelectOption<T = string> = {
  label: string;
  value: T;
  disabled?: boolean;
};

// ========================================
// INTERFACES D'UTILISATEUR
// ========================================

export interface BasicUser {
  id: number;
  name: string;
  email: string;
  avatar?: string;
}

export interface UserSummary extends BasicUser {
  role?: string;
  is_active?: boolean;
}

// ========================================
// INTERFACES DE FORMULAIRE
// ========================================

export interface FormError {
  field: string;
  message: string;
}

export interface FormValidationResult {
  isValid: boolean;
  errors: FormError[];
}

// ========================================
// INTERFACES DE MÉTRIQUE
// ========================================

export interface MetricValue {
  label: string;
  value: number | string;
  change?: number;
  changeType?: 'increase' | 'decrease';
  color?: string;
  icon?: string;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

// ========================================
// INTERFACES DE NOTIFICATION
// ========================================

export interface ToastMessage {
  id?: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    callback: () => void;
  };
}

// ========================================
// CONSTANTES COMMUNES
// ========================================

export const DEFAULT_PAGINATION = {
  page: 1,
  per_page: 20
} as const;

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
] as const;