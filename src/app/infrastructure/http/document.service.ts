/**
 * Document HTTP Service - Generic HTTP Service for Document Management
 * Handles HTTP communication with document endpoints for both clients and suppliers
 */

import { Injectable, Inject, InjectionToken } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '../../core/api/api.service';
import {
  DocumentEntity,
  DocumentListResponse,
  DocumentFilters,
  CreateDocumentRequest,
  UpdateDocumentRequest,
  DocumentVersion,
  EntityType,
  DocumentFolder,
  CreateFolderRequest,
  FolderResponse
} from '../../domain/entities/document.entity';
import { DocumentRepository, UploadOptions, UploadProgress } from '../../domain/repositories/document.repository';

export const ENTITY_TYPE_TOKEN = new InjectionToken<EntityType>('EntityType');

/**
 * Generic Document HTTP Service
 */
@Injectable()
export class DocumentHttpService extends DocumentRepository {

  constructor(
    private apiService: ApiService,
    private http: HttpClient,
    @Inject(ENTITY_TYPE_TOKEN) protected entityType: EntityType
  ) {
    super();
  }

  /**
   * List documents for entity
   */
  list(entityId: number, filters?: DocumentFilters): Observable<DocumentListResponse> {
    const endpoint = this.buildEndpoint(entityId);
    const params = this.buildRequestParams(filters);

    return this.apiService.get<any>(endpoint, { params }).pipe(
      map(response => {
        if (response.success) {
          return response.data;
        }
        throw new Error(response.message || 'Erreur lors du chargement des documents');
      }),
      catchError(this.handleError('listing documents'))
    );
  }

  /**
   * Upload document
   */
  upload(entityId: number, request: CreateDocumentRequest): Observable<DocumentEntity> {
    const endpoint = this.buildEndpoint(entityId);
    const formData = this.buildFormData(request);

    return this.apiService.post<any>(endpoint, formData).pipe(
      map(response => {
        if (response.success) {
          return response.data;
        }
        throw new Error(response.message || 'Erreur lors de l\'upload');
      }),
      catchError(this.handleError('uploading document'))
    );
  }

  /**
   * Upload with progress tracking
   */
  uploadWithProgress(
    entityId: number,
    request: CreateDocumentRequest,
    options?: UploadOptions
  ): Observable<DocumentEntity> {
    const url = this.apiService.getFullUrl(this.buildEndpoint(entityId));
    const formData = this.buildFormData(request);

    // Validate file before upload
    const validationErrors = this.validateFile(request.file);
    if (validationErrors.length > 0) {
      return throwError(() => new Error(validationErrors[0]));
    }

    return new Observable(observer => {
      const xhr = new XMLHttpRequest();

      // Handle upload progress
      if (options?.onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress: UploadProgress = {
              loaded: event.loaded,
              total: event.total,
              percentage: Math.round((event.loaded / event.total) * 100)
            };
            options.onProgress!(progress);
          }
        });
      }

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.success) {
              observer.next(response.data);
              observer.complete();
            } else {
              observer.error(new Error(response.message || 'Upload failed'));
            }
          } catch (error) {
            observer.error(new Error('Invalid response format'));
          }
        } else {
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            observer.error(new Error(errorResponse.message || `Upload failed with status ${xhr.status}`));
          } catch {
            observer.error(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        observer.error(new Error('Network error during upload'));
      });

      // Handle abort (for cancellation)
      xhr.addEventListener('abort', () => {
        observer.error(new Error('Upload cancelled'));
      });

      // Setup cancellation
      if (options?.signal) {
        options.signal.addEventListener('abort', () => {
          xhr.abort();
        });
      }

      // Start upload
      xhr.open('POST', url);

      // Add authorization header if available
      const authHeaders = this.apiService.getAuthHeaders();
      Object.keys(authHeaders).forEach(key => {
        xhr.setRequestHeader(key, authHeaders[key]);
      });

      xhr.send(formData);
    });
  }

  /**
   * Get document details
   */
  getById(entityId: number, documentId: number): Observable<DocumentEntity> {
    const endpoint = this.buildEndpoint(entityId, documentId.toString());

    return this.apiService.get<any>(endpoint).pipe(
      map(response => {
        if (response.success) {
          return response.data;
        }
        throw new Error(response.message || 'Document non trouvé');
      }),
      catchError(this.handleError('getting document details'))
    );
  }

  /**
   * Update document metadata
   */
  update(entityId: number, documentId: number, request: UpdateDocumentRequest): Observable<DocumentEntity> {
    const endpoint = this.buildEndpoint(entityId, documentId.toString());

    return this.apiService.put<any>(endpoint, request).pipe(
      map(response => {
        if (response.success) {
          return response.data;
        }
        throw new Error(response.message || 'Erreur lors de la mise à jour');
      }),
      catchError(this.handleError('updating document'))
    );
  }

  /**
   * Delete document
   */
  delete(entityId: number, documentId: number): Observable<void> {
    const endpoint = this.buildEndpoint(entityId, documentId.toString());

    return this.apiService.delete<any>(endpoint).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.message || 'Erreur lors de la suppression');
        }
      }),
      catchError(this.handleError('deleting document'))
    );
  }

  /**
   * Download document
   */
  download(entityId: number, documentId: number): Observable<Blob> {
    const endpoint = this.buildEndpoint(entityId, `${documentId}/download`);

    return this.apiService.get<Blob>(endpoint, {
      responseType: 'blob'
    }).pipe(
      catchError(this.handleError('downloading document'))
    );
  }

  /**
   * Preview document
   * CRITIQUE: Headers spéciaux pour éviter les problèmes de cache
   */
  preview(entityId: number, documentId: number): Observable<Blob> {
    const endpoint = this.buildEndpoint(entityId, `${documentId}/preview`);
    // Cache-busting pour éviter les anciens headers JSON
    const cacheBreaker = Date.now();

    return this.http.get(`${this.apiService.getBaseUrl()}${endpoint}?v=${cacheBreaker}`, {
      headers: {
        'Authorization': this.apiService.getAuthHeaders()['Authorization'],
        'Accept': '*/*', // Accepter tout type de contenu
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      responseType: 'blob' // CRITIQUE: Spécifier que nous attendons du binaire
    }).pipe(
      catchError(this.handleError('previewing document'))
    );
  }

  /**
   * Get document versions
   */
  getVersions(entityId: number, documentId: number): Observable<DocumentVersion[]> {
    const endpoint = this.buildEndpoint(entityId, `${documentId}/versions`);

    return this.apiService.get<any>(endpoint).pipe(
      map(response => {
        if (response.success) {
          return response.data;
        }
        throw new Error(response.message || 'Erreur lors du chargement des versions');
      }),
      catchError(this.handleError('getting document versions'))
    );
  }

  /**
   * List folders for entity
   */
  getFolders(entityId: number): Observable<DocumentFolder[]> {
    const endpoint = this.buildEndpoint(entityId, 'folders');

    return this.apiService.get<FolderResponse>(endpoint).pipe(
      map(response => {
        if (response.success) {
          return response.data.folders;
        }
        throw new Error('Erreur lors du chargement des dossiers');
      }),
      catchError(this.handleError('getting folders'))
    );
  }

  /**
   * Create a new folder
   */
  createFolder(entityId: number, folderRequest: CreateFolderRequest): Observable<DocumentFolder> {
    const endpoint = this.buildEndpoint(entityId, 'folders');

    return this.apiService.post<any>(endpoint, folderRequest).pipe(
      map(response => {
        if (response.success) {
          return response.data;
        }
        throw new Error(response.message || 'Erreur lors de la création du dossier');
      }),
      catchError(this.handleError('creating folder'))
    );
  }

  /**
   * Build endpoint for entity (relative to API base URL)
   */
  protected override buildEndpoint(entityId: number, path: string = ''): string {
    const entityPath = this.entityType === 'client' ? 'clients' : 'suppliers';
    const baseEndpoint = `/${entityPath}/${entityId}/documents`;
    return path ? `${baseEndpoint}/${path}` : baseEndpoint;
  }

  /**
   * Build request params from filters
   */
  private buildRequestParams(filters?: DocumentFilters): { [param: string]: string } {
    const params: { [param: string]: string } = {};

    if (filters) {
      if (filters.category) {
        params['category'] = filters.category;
      }
      if (filters.sort) {
        params['sort'] = filters.sort;
      }
      if (filters.order) {
        params['order'] = filters.order;
      }
      if (filters.latest_only !== undefined) {
        params['latest_only'] = filters.latest_only.toString();
      }
      if (filters.folder_path) {
        params['folder_path'] = filters.folder_path;
      }
      if (filters.search) {
        params['search'] = filters.search;
      }
    }

    return params;
  }


  /**
   * Generic error handler
   */
  private handleError(operation: string) {
    return (error: any): Observable<never> => {
      console.error(`Error ${operation}:`, error);

      let errorMessage = 'Une erreur est survenue';

      if (error.status === 0) {
        errorMessage = 'Erreur de connexion au serveur';
      } else if (error.status === 401) {
        errorMessage = 'Accès non autorisé';
      } else if (error.status === 403) {
        errorMessage = 'Accès interdit';
      } else if (error.status === 404) {
        errorMessage = 'Ressource non trouvée';
      } else if (error.status === 413) {
        errorMessage = 'Fichier trop volumineux (max 10MB)';
      } else if (error.status === 415) {
        errorMessage = 'Type de fichier non supporté';
      } else if (error.status === 422) {
        errorMessage = error.error?.message || 'Erreur de validation';
      } else if (error.status >= 500) {
        errorMessage = 'Erreur serveur, veuillez réessayer';
      } else if (error.message) {
        errorMessage = error.message;
      }

      return throwError(() => new Error(errorMessage));
    };
  }

  /**
   * Build FormData for file upload
   */
  protected override buildFormData(request: CreateDocumentRequest): FormData {
    const formData = new FormData();

    formData.append('file', request.file);
    formData.append('title', request.title);

    if (request.description) {
      formData.append('description', request.description);
    }

    if (request.folder_path) {
      formData.append('folder_path', request.folder_path);
    }

    if (request.category) {
      formData.append('category', request.category);
    }

    return formData;
  }

  /**
   * Validate file before upload
   */
  protected override validateFile(file: File): string[] {
    const errors: string[] = [];

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      errors.push('Le fichier ne peut pas dépasser 10MB');
    }

    // Check file type (you can customize allowed types)
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!allowedTypes.includes(file.type)) {
      errors.push('Type de fichier non autorisé');
    }

    return errors;
  }
}

/**
 * Client Documents Service
 */
@Injectable({
  providedIn: 'root'
})
export class ClientDocumentService extends DocumentHttpService {
  constructor(apiService: ApiService, http: HttpClient) {
    super(apiService, http, 'client');
  }
}

/**
 * Supplier Documents Service
 */
@Injectable({
  providedIn: 'root'
})
export class SupplierDocumentService extends DocumentHttpService {
  constructor(apiService: ApiService, http: HttpClient) {
    super(apiService, http, 'supplier');
  }
}

/**
 * Document Service Factory
 * Creates the appropriate service based on entity type
 */
@Injectable({
  providedIn: 'root'
})
export class DocumentServiceFactory {
  constructor(
    private apiService: ApiService,
    private http: HttpClient
  ) {}

  create(entityType: EntityType): DocumentHttpService {
    return new DocumentHttpService(this.apiService, this.http, entityType);
  }

  createClientService(): ClientDocumentService {
    return new ClientDocumentService(this.apiService, this.http);
  }

  createSupplierService(): SupplierDocumentService {
    return new SupplierDocumentService(this.apiService, this.http);
  }
}

/**
 * Document Upload Progress Tracker
 */
@Injectable({
  providedIn: 'root'
})
export class DocumentUploadTracker {
  private activeUploads = new Map<string, UploadProgress>();

  /**
   * Track upload progress
   */
  trackUpload(uploadId: string, progress: UploadProgress): void {
    this.activeUploads.set(uploadId, progress);
  }

  /**
   * Get upload progress
   */
  getProgress(uploadId: string): UploadProgress | undefined {
    return this.activeUploads.get(uploadId);
  }

  /**
   * Complete upload tracking
   */
  completeUpload(uploadId: string): void {
    this.activeUploads.delete(uploadId);
  }

  /**
   * Get all active uploads
   */
  getActiveUploads(): Map<string, UploadProgress> {
    return new Map(this.activeUploads);
  }

  /**
   * Cancel upload
   */
  cancelUpload(uploadId: string): void {
    this.activeUploads.delete(uploadId);
  }
}