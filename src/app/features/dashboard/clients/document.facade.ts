/**
 * Client Document Facade
 * Provides a clean interface for client document operations
 */

import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { tap, catchError, finalize, map } from 'rxjs/operators';

import {
  Document,
  DocumentFilters,
  CreateDocumentRequest,
  UpdateDocumentRequest,
  DocumentVersion,
  DocumentStatistics,
  DocumentFolder,
  CreateFolderRequest
} from '../../../domain/entities/document.entity';
import { UploadOptions } from '../../../domain/repositories/document.repository';

// Use Cases
import {
  ListDocumentsUseCase,
  UploadDocumentUseCase,
  GetDocumentUseCase,
  UpdateDocumentUseCase,
  DeleteDocumentUseCase,
  DownloadDocumentUseCase,
  PreviewDocumentUseCase,
  GetDocumentVersionsUseCase,
  DocumentStatisticsUseCase,
  DocumentBulkOperationsUseCase,
  DocumentSearchUseCase
} from '../../../domain/use-cases/document.use-cases';

// Infrastructure
import { ClientDocumentService } from '../../../infrastructure/http/document.service';

export interface DocumentsState {
  documents: Document[];
  statistics: DocumentStatistics;
  selectedDocument: Document | null;
  isLoading: boolean;
  isLoadingFolders: boolean;
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
  filters: DocumentFilters;
  searchTerm: string;
  folders?: DocumentFolder[];
}

@Injectable({
  providedIn: 'root'
})
export class ClientDocumentFacade {
  private stateSubject = new BehaviorSubject<DocumentsState>({
    documents: [],
    statistics: {
      total_documents: 0,
      total_size: 0,
      formatted_total_size: '0 B',
      by_category: { contrat: 0, devis: 0, facture: 0, autre: 0 }
    },
    selectedDocument: null,
    isLoading: false,
    isLoadingFolders: false,
    isUploading: false,
    uploadProgress: 0,
    error: null,
    filters: { latest_only: true },
    searchTerm: '',
    folders: []
  });

  public readonly state$ = this.stateSubject.asObservable();

  constructor(
    private documentService: ClientDocumentService,
    private listDocumentsUseCase: ListDocumentsUseCase,
    private uploadDocumentUseCase: UploadDocumentUseCase,
    private getDocumentUseCase: GetDocumentUseCase,
    private updateDocumentUseCase: UpdateDocumentUseCase,
    private deleteDocumentUseCase: DeleteDocumentUseCase,
    private downloadDocumentUseCase: DownloadDocumentUseCase,
    private previewDocumentUseCase: PreviewDocumentUseCase,
    private getVersionsUseCase: GetDocumentVersionsUseCase,
    private statisticsUseCase: DocumentStatisticsUseCase,
    private bulkOperationsUseCase: DocumentBulkOperationsUseCase,
    private searchUseCase: DocumentSearchUseCase
  ) {}

  // State getters
  get currentState(): DocumentsState {
    return this.stateSubject.value;
  }

  get documents$(): Observable<Document[]> {
    return this.state$.pipe(map((state: DocumentsState) => state.documents));
  }

  get statistics$(): Observable<DocumentStatistics> {
    return this.state$.pipe(map((state: DocumentsState) => state.statistics));
  }

  get isLoading$(): Observable<boolean> {
    return this.state$.pipe(map((state: DocumentsState) => state.isLoading));
  }

  get isUploading$(): Observable<boolean> {
    return this.state$.pipe(map((state: DocumentsState) => state.isUploading));
  }

  get uploadProgress$(): Observable<number> {
    return this.state$.pipe(map((state: DocumentsState) => state.uploadProgress));
  }

  get error$(): Observable<string | null> {
    return this.state$.pipe(map((state: DocumentsState) => state.error));
  }

  /**
   * Load documents for a client
   */
  loadDocuments(clientId: number, filters?: DocumentFilters): Observable<void> {
    this.updateState({ isLoading: true, error: null });

    const finalFilters = { ...this.currentState.filters, ...filters };

    return this.listDocumentsUseCase.execute(this.documentService, clientId, finalFilters).pipe(
      tap(response => {
        this.updateState({
          documents: response.documents,
          statistics: response.statistics,
          filters: finalFilters,
          isLoading: false
        });
      }),
      map(() => void 0),
      catchError(error => {
        this.updateState({
          isLoading: false,
          error: error.message
        });
        return of(void 0);
      })
    );
  }

  /**
   * Upload a new document
   */
  uploadDocument(
    clientId: number,
    request: CreateDocumentRequest,
    options?: UploadOptions
  ): Observable<Document> {
    this.updateState({
      isUploading: true,
      uploadProgress: 0,
      error: null
    });

    const uploadOptions: UploadOptions = {
      ...options,
      onProgress: (progress) => {
        this.updateState({ uploadProgress: progress.percentage });
        options?.onProgress?.(progress);
      }
    };

    return this.uploadDocumentUseCase.execute(
      this.documentService,
      clientId,
      request,
      uploadOptions
    ).pipe(
      tap(document => {
        // Add new document to current list
        const currentDocuments = this.currentState.documents;
        this.updateState({
          documents: [document, ...currentDocuments],
          isUploading: false,
          uploadProgress: 100
        });

        // Refresh statistics
        this.refreshStatistics(clientId);
      }),
      catchError(error => {
        this.updateState({
          isUploading: false,
          uploadProgress: 0,
          error: error.message
        });
        throw error;
      }),
      finalize(() => {
        // Reset upload progress after a delay
        setTimeout(() => {
          this.updateState({ uploadProgress: 0 });
        }, 2000);
      })
    );
  }

  /**
   * Get document details
   */
  getDocument(clientId: number, documentId: number): Observable<Document> {
    this.updateState({ error: null });

    return this.getDocumentUseCase.execute(this.documentService, clientId, documentId).pipe(
      tap(document => {
        this.updateState({ selectedDocument: document });
      }),
      catchError(error => {
        this.updateState({ error: error.message });
        throw error;
      })
    );
  }

  /**
   * Update document metadata
   */
  updateDocument(
    clientId: number,
    documentId: number,
    request: UpdateDocumentRequest
  ): Observable<Document> {
    this.updateState({ error: null });

    return this.updateDocumentUseCase.execute(
      this.documentService,
      clientId,
      documentId,
      request
    ).pipe(
      tap(updatedDocument => {
        // Update document in current list
        const currentDocuments = this.currentState.documents;
        const updatedDocuments = currentDocuments.map(doc =>
          doc.id === documentId ? updatedDocument : doc
        );

        this.updateState({
          documents: updatedDocuments,
          selectedDocument: this.currentState.selectedDocument?.id === documentId
            ? updatedDocument
            : this.currentState.selectedDocument
        });
      }),
      catchError(error => {
        this.updateState({ error: error.message });
        throw error;
      })
    );
  }

  /**
   * Delete a document
   */
  deleteDocument(clientId: number, documentId: number): Observable<void> {
    this.updateState({ error: null });

    const document = this.currentState.documents.find(d => d.id === documentId);

    return this.deleteDocumentUseCase.execute(
      this.documentService,
      clientId,
      documentId,
      document?.title
    ).pipe(
      tap(() => {
        // Remove document from current list
        const currentDocuments = this.currentState.documents;
        const filteredDocuments = currentDocuments.filter(doc => doc.id !== documentId);

        this.updateState({
          documents: filteredDocuments,
          selectedDocument: this.currentState.selectedDocument?.id === documentId
            ? null
            : this.currentState.selectedDocument
        });

        // Refresh statistics
        this.refreshStatistics(clientId);
      }),
      catchError(error => {
        this.updateState({ error: error.message });
        throw error;
      })
    );
  }

  /**
   * Download a document
   */
  downloadDocument(clientId: number, documentId: number): Observable<void> {
    const document = this.currentState.documents.find(d => d.id === documentId);
    const filename = document ? `${document.title}.${document.fileExtension}` : undefined;

    return this.downloadDocumentUseCase.execute(
      this.documentService,
      clientId,
      documentId,
      filename
    ).pipe(
      catchError(error => {
        this.updateState({ error: error.message });
        throw error;
      })
    );
  }

  /**
   * Preview a document
   */
  previewDocument(clientId: number, documentId: number): Observable<string> {
    return this.previewDocumentUseCase.execute(
      this.documentService,
      clientId,
      documentId
    ).pipe(
      catchError(error => {
        this.updateState({ error: error.message });
        throw error;
      })
    );
  }

  /**
   * Get document versions
   */
  getDocumentVersions(clientId: number, documentId: number): Observable<DocumentVersion[]> {
    return this.getVersionsUseCase.execute(
      this.documentService,
      clientId,
      documentId
    ).pipe(
      catchError(error => {
        this.updateState({ error: error.message });
        throw error;
      })
    );
  }

  /**
   * Search documents
   */
  searchDocuments(clientId: number, searchTerm: string): Observable<void> {
    this.updateState({ isLoading: true, searchTerm, error: null });

    return this.searchUseCase.execute(
      this.documentService,
      clientId,
      searchTerm,
      this.currentState.filters
    ).pipe(
      tap(documents => {
        this.updateState({
          documents,
          isLoading: false
        });
      }),
      map(() => void 0),
      catchError(error => {
        this.updateState({
          isLoading: false,
          error: error.message
        });
        return of(void 0);
      })
    );
  }

  /**
   * Apply filters
   */
  applyFilters(clientId: number, filters: DocumentFilters): Observable<void> {
    return this.loadDocuments(clientId, filters);
  }

  /**
   * Clear filters
   */
  clearFilters(clientId: number): Observable<void> {
    const defaultFilters: DocumentFilters = { latest_only: true };
    return this.loadDocuments(clientId, defaultFilters);
  }

  /**
   * Bulk delete documents
   */
  bulkDeleteDocuments(clientId: number, documentIds: number[]): Observable<void> {
    this.updateState({ error: null });

    return this.bulkOperationsUseCase.bulkDelete(
      this.documentService,
      clientId,
      documentIds
    ).pipe(
      tap(() => {
        // Remove deleted documents from current list
        const currentDocuments = this.currentState.documents;
        const remainingDocuments = currentDocuments.filter(
          doc => !documentIds.includes(doc.id)
        );

        this.updateState({ documents: remainingDocuments });

        // Refresh statistics
        this.refreshStatistics(clientId);
      }),
      map(() => void 0),
      catchError(error => {
        this.updateState({ error: error.message });
        throw error;
      })
    );
  }

  /**
   * Refresh statistics
   */
  refreshStatistics(clientId: number): Observable<void> {
    return this.statisticsUseCase.execute(this.documentService, clientId).pipe(
      tap(statistics => {
        this.updateState({ statistics });
      }),
      map(() => void 0),
      catchError(error => {
        console.warn('Failed to refresh statistics:', error);
        return of(void 0);
      })
    );
  }

  /**
   * Load folders for client
   */
  loadFolders(clientId: number): Observable<DocumentFolder[]> {
    this.updateState({ isLoadingFolders: true, error: null });

    return this.documentService.getFolders(clientId).pipe(
      tap(folders => {
        this.updateState({ folders, isLoadingFolders: false });
      }),
      catchError(error => {
        this.updateState({ error: error.message, isLoadingFolders: false });
        throw error;
      })
    );
  }

  /**
   * Create a new folder
   */
  createFolder(clientId: number, request: CreateFolderRequest): Observable<DocumentFolder> {
    this.updateState({ error: null });

    return this.documentService.createFolder(clientId, request).pipe(
      tap(newFolder => {
        const currentFolders = this.currentState.folders || [];
        this.updateState({ folders: [...currentFolders, newFolder] });
      }),
      catchError(error => {
        this.updateState({ error: error.message });
        throw error;
      })
    );
  }

  /**
   * Clear error
   */
  clearError(): void {
    this.updateState({ error: null });
  }

  /**
   * Reset state
   */
  resetState(): void {
    this.stateSubject.next({
      documents: [],
      statistics: {
        total_documents: 0,
        total_size: 0,
        formatted_total_size: '0 B',
        by_category: { contrat: 0, devis: 0, facture: 0, autre: 0 }
      },
      selectedDocument: null,
      isLoading: false,
      isLoadingFolders: false,
      isUploading: false,
      uploadProgress: 0,
      error: null,
      filters: { latest_only: true },
      searchTerm: '',
      folders: []
    });
  }

  /**
   * Update state
   */
  private updateState(partialState: Partial<DocumentsState>): void {
    const currentState = this.currentState;
    const newState = { ...currentState, ...partialState };
    this.stateSubject.next(newState);
  }
}