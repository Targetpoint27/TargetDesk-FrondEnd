/**
 * Create Folder Use Case
 * Handles business logic for creating new folders in client document structure
 */

import { Injectable } from '@angular/core';
import { Observable, map, catchError, of, switchMap } from 'rxjs';
import { FolderRepository } from '../../repositories/folder.repository';
import { FolderEntity } from '../../entities/folder.entity';
import {
  CreateFolderRequest,
  FolderUseCaseResult,
  FolderValidationResult,
  FolderCreatedEvent
} from '../../models/folder.models';

@Injectable({
  providedIn: 'root'
})
export class CreateFolderUseCase {
  constructor(private folderRepository: FolderRepository) {}

  execute(
    clientId: number,
    request: CreateFolderRequest,
    userId: string
  ): Observable<FolderUseCaseResult<FolderEntity>> {
    return this.validateRequest(request).pipe(
      switchMap(validation => {
        if (!validation.isValid) {
          return of({
            success: false,
            validationErrors: validation.errors
          });
        }

        return this.createFolder(clientId, request).pipe(
          map(folder => ({
            success: true,
            data: folder,
            events: [this.createDomainEvent(clientId, folder, userId)]
          })),
          catchError(error => {
            // Propager l'erreur HTTP directement
            throw error;
          })
        );
      })
    );
  }

  private validateRequest(request: CreateFolderRequest): Observable<FolderValidationResult> {
    const errors: Record<string, string[]> = {};

    // Folder name validation
    if (!request.folder_name || request.folder_name.trim().length === 0) {
      errors['folder_name'] = ['Le nom du dossier est obligatoire'];
    } else {
      const nameValidation = this.validateFolderName(request.folder_name.trim());
      if (!nameValidation.isValid) {
        errors['folder_name'] = [nameValidation.error!];
      }
    }

    // Parent path validation (if provided)
    if (request.parent_path && request.parent_path.trim().length > 0) {
      const pathValidation = this.validateParentPath(request.parent_path.trim());
      if (!pathValidation.isValid) {
        errors['parent_path'] = [pathValidation.error!];
      }
    }

    // Description validation (optional)
    if (request.description && request.description.length > 1000) {
      errors['description'] = ['La description ne peut pas dépasser 1000 caractères'];
    }

    return of({
      isValid: Object.keys(errors).length === 0,
      errors
    });
  }

  private validateFolderName(name: string): { isValid: boolean; error?: string } {
    if (name.length > 200) {
      return { isValid: false, error: 'Le nom du dossier ne peut pas dépasser 200 caractères' };
    }

    // Caractères interdits
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(name)) {
      return { isValid: false, error: 'Le nom du dossier contient des caractères invalides (<>:"/\\|?*)' };
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

  private validateParentPath(parentPath: string): { isValid: boolean; error?: string } {
    if (parentPath.length > 500) {
      return { isValid: false, error: 'Le chemin parent ne peut pas dépasser 500 caractères' };
    }

    // Le chemin ne doit pas contenir de double slash ou commencer/finir par un slash
    if (parentPath.includes('//') || parentPath.startsWith('/') || parentPath.endsWith('/')) {
      return { isValid: false, error: 'Le format du chemin parent n\'est pas valide' };
    }

    // Vérifier la profondeur (max 5 niveaux)
    const segments = parentPath.split('/').filter(s => s.length > 0);
    if (segments.length >= 5) {
      return { isValid: false, error: 'La profondeur maximale des dossiers (5 niveaux) est atteinte' };
    }

    return { isValid: true };
  }

  private createFolder(clientId: number, request: CreateFolderRequest): Observable<FolderEntity> {
    return this.folderRepository.create(clientId, request);
  }

  private createDomainEvent(
    clientId: number,
    folder: FolderEntity,
    userId: string
  ): FolderCreatedEvent {
    return {
      type: 'FOLDER_CREATED',
      clientId,
      folderPath: folder.path,
      userId,
      timestamp: new Date(),
      data: {
        folder_name: folder.name,
        parent_path: folder.parentPath || undefined,
        level: folder.level
      }
    };
  }
}