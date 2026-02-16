/**
 * Folder Facade
 * Coordinates folder-related operations and state management
 */

import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, map, tap, catchError, of } from 'rxjs';

import { FolderEntity } from '../../../domain/entities/folder.entity';
import { CreateFolderUseCase } from '../../../domain/use-cases/folder/create-folder.use-case';
import { GetFoldersUseCase } from '../../../domain/use-cases/folder/get-folders.use-case';
import {
  CreateFolderRequest,
  UpdateFolderRequest,
  FolderSearchParams,
  FolderUseCaseResult
} from '../../../domain/models/folder.models';
import { AppError } from '../../../core/error/error.service';

interface FolderState {
  folders: FolderEntity[];
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  error: AppError | null;
  currentClientId: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class FolderFacade {
  private state$ = new BehaviorSubject<FolderState>({
    folders: [],
    isLoading: false,
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    error: null,
    currentClientId: null
  });

  // Public observables
  folders$ = this.state$.pipe(map(state => state.folders));
  isLoading$ = this.state$.pipe(map(state => state.isLoading));
  isCreating$ = this.state$.pipe(map(state => state.isCreating));
  isUpdating$ = this.state$.pipe(map(state => state.isUpdating));
  isDeleting$ = this.state$.pipe(map(state => state.isDeleting));
  error$ = this.state$.pipe(map(state => state.error));
  hasFolders$ = this.state$.pipe(map(state => state.folders.length > 0));

  constructor(
    private createFolderUseCase: CreateFolderUseCase,
    private getFoldersUseCase: GetFoldersUseCase
  ) {}

  /**
   * Load folders for a specific client
   */
  loadFolders(clientId: number, includeCounts = true): Observable<FolderUseCaseResult<FolderEntity[]>> {
    this.setState({ isLoading: true, error: null, currentClientId: clientId });

    const params: FolderSearchParams = {
      client_id: clientId,
      include_counts: includeCounts
    };

    return this.getFoldersUseCase.execute(params).pipe(
      tap(result => {
        if (result.success && result.data) {
          this.setState({
            isLoading: false,
            folders: result.data,
            error: null
          });
        } else {
          this.setState({
            isLoading: false,
            error: new AppError(
              'FOLDER_LOAD_ERROR',
              result.error || 'Failed to load folders',
              'Impossible de charger les dossiers'
            )
          });
        }
      }),
      catchError(error => {
        this.setState({
          isLoading: false,
          error: error instanceof AppError ? error : new AppError(
            'FOLDER_LOAD_ERROR',
            'Failed to load folders',
            'Impossible de charger les dossiers'
          )
        });
        return of({ success: false, error: error.message });
      })
    );
  }

  /**
   * Load folders as tree structure
   */
  loadFoldersAsTree(clientId: number): Observable<FolderUseCaseResult<any>> {
    this.setState({ isLoading: true, error: null, currentClientId: clientId });

    const params: FolderSearchParams = {
      client_id: clientId,
      include_counts: true
    };

    return this.getFoldersUseCase.getFoldersAsTree(params).pipe(
      tap(result => {
        this.setState({ isLoading: false });
        if (!result.success) {
          this.setState({
            error: new AppError(
              'FOLDER_TREE_LOAD_ERROR',
              result.error || 'Failed to load folder tree',
              'Impossible de charger l\'arborescence des dossiers'
            )
          });
        }
      }),
      catchError(error => {
        this.setState({
          isLoading: false,
          error: error instanceof AppError ? error : new AppError(
            'FOLDER_TREE_LOAD_ERROR',
            'Failed to load folder tree',
            'Impossible de charger l\'arborescence des dossiers'
          )
        });
        return of({ success: false, error: error.message });
      })
    );
  }

  /**
   * Load folders for selection/dropdown
   */
  loadFoldersForSelection(clientId: number, maxLevel = 5): Observable<FolderUseCaseResult<any[]>> {
    return this.getFoldersUseCase.getFoldersForSelection(clientId, maxLevel);
  }

  /**
   * Create a new folder
   */
  createFolder(clientId: number, request: CreateFolderRequest, userId: string = 'current-user'): Observable<FolderUseCaseResult<FolderEntity>> {
    this.setState({ isCreating: true, error: null });

    return this.createFolderUseCase.execute(clientId, request, userId).pipe(
      tap(result => {
        if (result.success && result.data) {
          const currentState = this.state$.getValue();
          this.setState({
            isCreating: false,
            folders: [...currentState.folders, result.data],
            error: null
          });
        } else {
          this.setState({
            isCreating: false,
            error: new AppError(
              'FOLDER_CREATE_ERROR',
              result.error || 'Failed to create folder',
              'Impossible de créer le dossier'
            )
          });
        }
      }),
      catchError(error => {
        this.setState({
          isCreating: false,
          error: error instanceof AppError ? error : new AppError(
            'FOLDER_CREATE_ERROR',
            'Failed to create folder',
            'Impossible de créer le dossier'
          )
        });
        return of({ success: false, error: error.message });
      })
    );
  }

  /**
   * Get breadcrumbs for a folder path
   */
  getBreadcrumbs(folderPath: string): any[] {
    return this.getFoldersUseCase.getBreadcrumbs(folderPath);
  }

  /**
   * Get current client ID
   */
  getCurrentClientId(): number | null {
    return this.state$.getValue().currentClientId;
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.setState({ error: null });
  }

  /**
   * Reset facade state
   */
  reset(): void {
    this.state$.next({
      folders: [],
      isLoading: false,
      isCreating: false,
      isUpdating: false,
      isDeleting: false,
      error: null,
      currentClientId: null
    });
  }

  /**
   * Helper method to update state
   */
  private setState(update: Partial<FolderState>): void {
    const currentState = this.state$.getValue();
    this.state$.next({ ...currentState, ...update });
  }

  /**
   * Get current state snapshot
   */
  getCurrentState(): FolderState {
    return this.state$.getValue();
  }
}