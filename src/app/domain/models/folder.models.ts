/**
 * Folder Domain Models
 * Value objects and domain events for folder operations
 */

export interface CreateFolderRequest {
  folder_name: string;
  parent_path?: string;
  description?: string;
}

export interface UpdateFolderRequest {
  folder_name?: string;
  description?: string;
}

export interface FolderSearchParams {
  client_id: number;
  path_prefix?: string;
  level?: number;
  include_counts?: boolean;
  parent_path?: string;
  max_level?: number;
}

// Domain Events
export interface FolderDomainEvent {
  type: string;
  clientId: number;
  folderPath: string;
  userId: string;
  timestamp: Date;
  data?: any;
}

export interface FolderCreatedEvent extends FolderDomainEvent {
  type: 'FOLDER_CREATED';
  data: {
    folder_name: string;
    parent_path?: string;
    level: number;
  };
}

export interface FolderUpdatedEvent extends FolderDomainEvent {
  type: 'FOLDER_UPDATED';
  data: {
    changes: Partial<UpdateFolderRequest>;
    previousValues: Partial<UpdateFolderRequest>;
  };
}

export interface FolderDeletedEvent extends FolderDomainEvent {
  type: 'FOLDER_DELETED';
  data: {
    folder_name: string;
    document_count: number;
  };
}

// Use Case Results
export interface FolderUseCaseResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  validationErrors?: Record<string, string[]>;
  events?: FolderDomainEvent[];
  warnings?: string[];
}

// Validation Result
export interface FolderValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
}

// API Response Types
export interface FolderListResponse {
  success: boolean;
  data: {
    folders: {
      path: string;
      name: string;
      level: number;
      parent_path?: string;
      description?: string;
      document_count: number;
      created_at: string;
      updated_at: string;
    }[];
  };
}

export interface FolderResponse {
  success: boolean;
  data: {
    path: string;
    name: string;
    level: number;
    parent_path?: string;
    description?: string;
    document_count: number;
    created_at: string;
    updated_at: string;
  };
}

// Upload with folder assignment
export interface DocumentUploadRequest {
  file: File;
  title?: string;
  description?: string;
  folder_path?: string;
  category?: string; // For backward compatibility
}

// Utility types for folder operations
export interface FolderMenuItem {
  path: string;
  name: string;
  level: number;
  displayName: string;
  isDisabled?: boolean;
}

export interface FolderBreadcrumb {
  name: string;
  path: string;
  isActive: boolean;
}

/**
 * Folder validation utilities
 */
export class FolderValidation {
  static validateFolderName(name: string): { isValid: boolean; error?: string } {
    if (!name || name.trim().length === 0) {
      return { isValid: false, error: 'Le nom du dossier est obligatoire' };
    }

    if (name.length > 200) {
      return { isValid: false, error: 'Le nom du dossier ne peut pas dépasser 200 caractères' };
    }

    // Caractères interdits dans les noms de dossiers
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(name)) {
      return { isValid: false, error: 'Le nom du dossier contient des caractères invalides' };
    }

    // Noms réservés
    const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
    if (reservedNames.includes(name.toUpperCase())) {
      return { isValid: false, error: 'Ce nom de dossier est réservé par le système' };
    }

    // Ne peut pas commencer ou finir par un point ou un espace
    if (name.startsWith('.') || name.endsWith('.') || name.startsWith(' ') || name.endsWith(' ')) {
      return { isValid: false, error: 'Le nom du dossier ne peut pas commencer ou finir par un point ou un espace' };
    }

    return { isValid: true };
  }

  static validateFolderPath(path: string): { isValid: boolean; error?: string } {
    if (!path || path.trim().length === 0) {
      return { isValid: false, error: 'Le chemin du dossier est obligatoire' };
    }

    if (path.length > 500) {
      return { isValid: false, error: 'Le chemin du dossier ne peut pas dépasser 500 caractères' };
    }

    // Le chemin ne doit pas contenir de double slash ou commencer/finir par un slash
    if (path.includes('//') || path.startsWith('/') || path.endsWith('/')) {
      return { isValid: false, error: 'Le format du chemin n\'est pas valide' };
    }

    // Vérifier que tous les segments sont valides
    const segments = path.split('/');
    for (const segment of segments) {
      const validation = this.validateFolderName(segment);
      if (!validation.isValid) {
        return validation;
      }
    }

    return { isValid: true };
  }
}

/**
 * Folder utilities for UI operations
 * Re-export from folder.entity.ts to avoid duplication
 */
export { FolderUtils } from '../entities/folder.entity';