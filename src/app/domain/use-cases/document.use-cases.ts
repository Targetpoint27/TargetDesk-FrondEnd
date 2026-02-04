/**
 * Document Use Cases - Business Logic for Document Management
 * Generic use cases for both client and supplier documents
 */

import { Injectable } from '@angular/core';
import { Observable, throwError, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import {
  Document,
  DocumentEntity,
  DocumentListResponse,
  DocumentFilters,
  CreateDocumentRequest,
  UpdateDocumentRequest,
  DocumentVersion,
  DocumentStatistics,
  EntityType
} from '../entities/document.entity';
import { DocumentRepository, UploadOptions, UploadProgress } from '../repositories/document.repository';

/**
 * List Documents Use Case
 */
@Injectable({
  providedIn: 'root'
})
export class ListDocumentsUseCase {
  execute(
    repository: DocumentRepository,
    entityId: number,
    filters?: DocumentFilters
  ): Observable<{ documents: Document[], statistics: DocumentStatistics }> {
    return repository.list(entityId, filters).pipe(
      map(response => ({
        documents: response.documents.map(doc => Document.fromResponse(doc)),
        statistics: response.statistics
      })),
      catchError(error => {
        console.error('Error listing documents:', error);
        return throwError(() => new Error('Erreur lors du chargement des documents'));
      })
    );
  }
}

/**
 * Upload Document Use Case
 */
@Injectable({
  providedIn: 'root'
})
export class UploadDocumentUseCase {
  execute(
    repository: DocumentRepository,
    entityId: number,
    request: CreateDocumentRequest,
    options?: UploadOptions
  ): Observable<Document> {
    // Validate request
    const validationErrors = this.validateUploadRequest(request);
    if (validationErrors.length > 0) {
      return throwError(() => new Error(validationErrors[0]));
    }

    // Execute upload
    const uploadObservable = 'uploadWithProgress' in repository
      ? (repository as any).uploadWithProgress(entityId, request, options)
      : repository.upload(entityId, request);

    return uploadObservable.pipe(
      map((response: DocumentEntity) => Document.fromResponse(response)),
      tap((document: Document) => {
        console.log(`Document uploaded successfully: ${document.title} (v${document.version})`);
      }),
      catchError(error => {
        console.error('Error uploading document:', error);
        const errorMessage = this.getUploadErrorMessage(error);
        return throwError(() => new Error(errorMessage));
      })
    );
  }

  private validateUploadRequest(request: CreateDocumentRequest): string[] {
    const errors: string[] = [];

    if (!request.file) {
      errors.push('Aucun fichier sélectionné');
    }

    if (!request.title?.trim()) {
      errors.push('Le titre est obligatoire');
    } else if (request.title.length < 2) {
      errors.push('Le titre doit contenir au moins 2 caractères');
    } else if (request.title.length > 255) {
      errors.push('Le titre ne peut pas dépasser 255 caractères');
    }

    if (!request.category) {
      errors.push('La catégorie est obligatoire');
    }

    if (request.description && request.description.length > 1000) {
      errors.push('La description ne peut pas dépasser 1000 caractères');
    }

    return errors;
  }

  private getUploadErrorMessage(error: any): string {
    if (error?.status === 422) {
      return error.error?.message || 'Erreur de validation du fichier';
    }
    if (error?.status === 413) {
      return 'Le fichier est trop volumineux (max 10MB)';
    }
    if (error?.status === 415) {
      return 'Type de fichier non supporté';
    }
    return 'Erreur lors de l\'upload du document';
  }
}

/**
 * Get Document Details Use Case
 */
@Injectable({
  providedIn: 'root'
})
export class GetDocumentUseCase {
  execute(
    repository: DocumentRepository,
    entityId: number,
    documentId: number
  ): Observable<Document> {
    return repository.getById(entityId, documentId).pipe(
      map(response => Document.fromResponse(response)),
      catchError(error => {
        console.error('Error getting document:', error);
        return throwError(() => new Error('Document non trouvé'));
      })
    );
  }
}

/**
 * Update Document Use Case
 */
@Injectable({
  providedIn: 'root'
})
export class UpdateDocumentUseCase {
  execute(
    repository: DocumentRepository,
    entityId: number,
    documentId: number,
    request: UpdateDocumentRequest
  ): Observable<Document> {
    // Validate update request
    const validationErrors = this.validateUpdateRequest(request);
    if (validationErrors.length > 0) {
      return throwError(() => new Error(validationErrors[0]));
    }

    return repository.update(entityId, documentId, request).pipe(
      map(response => Document.fromResponse(response)),
      tap((document: Document) => {
        console.log(`Document updated successfully: ${document.title}`);
      }),
      catchError(error => {
        console.error('Error updating document:', error);
        return throwError(() => new Error('Erreur lors de la mise à jour du document'));
      })
    );
  }

  private validateUpdateRequest(request: UpdateDocumentRequest): string[] {
    const errors: string[] = [];

    if (request.title !== undefined) {
      if (!request.title?.trim()) {
        errors.push('Le titre ne peut pas être vide');
      } else if (request.title.length < 2) {
        errors.push('Le titre doit contenir au moins 2 caractères');
      } else if (request.title.length > 255) {
        errors.push('Le titre ne peut pas dépasser 255 caractères');
      }
    }

    if (request.description !== undefined && request.description && request.description.length > 1000) {
      errors.push('La description ne peut pas dépasser 1000 caractères');
    }

    return errors;
  }
}

/**
 * Delete Document Use Case
 */
@Injectable({
  providedIn: 'root'
})
export class DeleteDocumentUseCase {
  execute(
    repository: DocumentRepository,
    entityId: number,
    documentId: number,
    documentTitle?: string
  ): Observable<void> {
    return repository.delete(entityId, documentId).pipe(
      tap(() => {
        console.log(`Document deleted successfully: ${documentTitle || documentId}`);
      }),
      catchError(error => {
        console.error('Error deleting document:', error);
        return throwError(() => new Error('Erreur lors de la suppression du document'));
      })
    );
  }
}

/**
 * Download Document Use Case
 */
@Injectable({
  providedIn: 'root'
})
export class DownloadDocumentUseCase {
  execute(
    repository: DocumentRepository,
    entityId: number,
    documentId: number,
    filename?: string
  ): Observable<void> {
    return repository.download(entityId, documentId).pipe(
      tap((blob: Blob) => {
        this.triggerDownload(blob, filename || `document_${documentId}`);
      }),
      map(() => void 0),
      catchError(error => {
        console.error('Error downloading document:', error);
        return throwError(() => new Error('Erreur lors du téléchargement'));
      })
    );
  }

  private triggerDownload(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(link);
  }
}

/**
 * Preview Document Use Case
 */
@Injectable({
  providedIn: 'root'
})
export class PreviewDocumentUseCase {
  execute(
    repository: DocumentRepository,
    entityId: number,
    documentId: number
  ): Observable<string> {
    return repository.preview(entityId, documentId).pipe(
      map((blob: Blob) => {
        return window.URL.createObjectURL(blob);
      }),
      catchError(error => {
        console.error('Error previewing document:', error);
        return throwError(() => new Error('Aperçu non disponible pour ce document'));
      })
    );
  }
}

/**
 * Get Document Versions Use Case
 */
@Injectable({
  providedIn: 'root'
})
export class GetDocumentVersionsUseCase {
  execute(
    repository: DocumentRepository,
    entityId: number,
    documentId: number
  ): Observable<DocumentVersion[]> {
    return repository.getVersions(entityId, documentId).pipe(
      map((versions: DocumentVersion[]) => versions.sort((a, b) => b.version - a.version)), // Sort by version desc
      catchError(error => {
        console.error('Error getting document versions:', error);
        return throwError(() => new Error('Erreur lors du chargement des versions'));
      })
    );
  }
}

/**
 * Document Statistics Use Case
 */
@Injectable({
  providedIn: 'root'
})
export class DocumentStatisticsUseCase {
  execute(
    repository: DocumentRepository,
    entityId: number
  ): Observable<DocumentStatistics> {
    return repository.list(entityId, { latest_only: true }).pipe(
      map((response: { statistics: DocumentStatistics }) => response.statistics),
      catchError(error => {
        console.error('Error getting document statistics:', error);
        return of({
          total_documents: 0,
          total_size: 0,
          formatted_total_size: '0 B',
          by_category: {
            contrat: 0,
            devis: 0,
            facture: 0,
            autre: 0
          }
        });
      })
    );
  }
}

/**
 * Bulk Operations Use Case
 */
@Injectable({
  providedIn: 'root'
})
export class DocumentBulkOperationsUseCase {
  constructor(
    private deleteUseCase: DeleteDocumentUseCase,
    private downloadUseCase: DownloadDocumentUseCase
  ) {}

  /**
   * Delete multiple documents
   */
  bulkDelete(
    repository: DocumentRepository,
    entityId: number,
    documentIds: number[]
  ): Observable<void[]> {
    const deleteOperations = documentIds.map(id =>
      this.deleteUseCase.execute(repository, entityId, id)
    );

    // Execute all delete operations
    return new Observable(observer => {
      let completed = 0;
      const results: void[] = [];
      const errors: Error[] = [];

      deleteOperations.forEach((operation, index) => {
        operation.subscribe({
          next: (result: void) => {
            results[index] = result;
            completed++;

            if (completed === documentIds.length) {
              if (errors.length > 0) {
                observer.error(new Error(`${errors.length} documents n'ont pas pu être supprimés`));
              } else {
                observer.next(results);
                observer.complete();
              }
            }
          },
          error: (error: Error) => {
            errors[index] = error;
            completed++;

            if (completed === documentIds.length) {
              observer.error(new Error(`${errors.length} documents n'ont pas pu être supprimés`));
            }
          }
        });
      });
    });
  }

  /**
   * Download multiple documents as ZIP (placeholder - requires backend support)
   */
  bulkDownload(
    repository: DocumentRepository,
    entityId: number,
    documentIds: number[]
  ): Observable<void> {
    // For now, download individually
    // In future, implement ZIP download endpoint
    return new Observable(observer => {
      let completed = 0;

      documentIds.forEach((id, index) => {
        this.downloadUseCase.execute(repository, entityId, id, `document_${id}`).subscribe({
          next: () => {
            completed++;
            if (completed === documentIds.length) {
              observer.next();
              observer.complete();
            }
          },
          error: (error: Error) => {
            console.error(`Error downloading document ${id}:`, error);
            completed++;
            if (completed === documentIds.length) {
              observer.next();
              observer.complete();
            }
          }
        });
      });
    });
  }
}

/**
 * Document Search Use Case
 */
@Injectable({
  providedIn: 'root'
})
export class DocumentSearchUseCase {
  execute(
    repository: DocumentRepository,
    entityId: number,
    searchTerm: string,
    filters?: DocumentFilters
  ): Observable<Document[]> {
    return repository.list(entityId, filters).pipe(
      map((response: DocumentListResponse) => {
        const documents = response.documents.map(doc => Document.fromResponse(doc));

        if (!searchTerm?.trim()) {
          return documents;
        }

        const term = searchTerm.toLowerCase().trim();
        return documents.filter(doc =>
          doc.title.toLowerCase().includes(term) ||
          doc.description?.toLowerCase().includes(term) ||
          doc.originalName.toLowerCase().includes(term) ||
          doc.categoryInfo.label.toLowerCase().includes(term)
        );
      }),
      catchError(error => {
        console.error('Error searching documents:', error);
        return throwError(() => new Error('Erreur lors de la recherche'));
      })
    );
  }
}