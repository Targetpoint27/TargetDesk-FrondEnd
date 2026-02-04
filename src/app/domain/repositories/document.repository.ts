/**
 * Document Repository Interface - Generic Document Management
 * Abstract repository for both client and supplier documents
 */

import { Observable } from 'rxjs';
import {
  DocumentEntity,
  DocumentListResponse,
  DocumentFilters,
  CreateDocumentRequest,
  UpdateDocumentRequest,
  DocumentVersion,
  EntityType
} from '../entities/document.entity';

/**
 * Generic interface for document operations
 */
export interface DocumentOperations {
  /**
   * List documents with optional filters
   */
  list(entityId: number, filters?: DocumentFilters): Observable<DocumentListResponse>;

  /**
   * Upload a new document
   */
  upload(entityId: number, request: CreateDocumentRequest): Observable<DocumentEntity>;

  /**
   * Get document details by ID
   */
  getById(entityId: number, documentId: number): Observable<DocumentEntity>;

  /**
   * Update document metadata
   */
  update(entityId: number, documentId: number, request: UpdateDocumentRequest): Observable<DocumentEntity>;

  /**
   * Delete a document permanently
   */
  delete(entityId: number, documentId: number): Observable<void>;

  /**
   * Download document file
   */
  download(entityId: number, documentId: number): Observable<Blob>;

  /**
   * Preview document (for PDF and images)
   */
  preview(entityId: number, documentId: number): Observable<Blob>;

  /**
   * Get all versions of a document
   */
  getVersions(entityId: number, documentId: number): Observable<DocumentVersion[]>;
}

/**
 * Abstract Document Repository
 * Must be implemented for each entity type (client/supplier)
 */
export abstract class DocumentRepository {
  protected abstract entityType: EntityType;

  /**
   * Get documents for a specific entity
   */
  abstract list(entityId: number, filters?: DocumentFilters): Observable<DocumentListResponse>;

  /**
   * Upload document for a specific entity
   */
  abstract upload(entityId: number, request: CreateDocumentRequest): Observable<DocumentEntity>;

  /**
   * Get document details
   */
  abstract getById(entityId: number, documentId: number): Observable<DocumentEntity>;

  /**
   * Update document metadata
   */
  abstract update(entityId: number, documentId: number, request: UpdateDocumentRequest): Observable<DocumentEntity>;

  /**
   * Delete document
   */
  abstract delete(entityId: number, documentId: number): Observable<void>;

  /**
   * Download document
   */
  abstract download(entityId: number, documentId: number): Observable<Blob>;

  /**
   * Preview document
   */
  abstract preview(entityId: number, documentId: number): Observable<Blob>;

  /**
   * Get document versions
   */
  abstract getVersions(entityId: number, documentId: number): Observable<DocumentVersion[]>;

  /**
   * Build endpoint URL for entity type
   */
  protected buildEndpoint(entityId: number, path: string = ''): string {
    const baseUrl = `/${this.entityType === 'client' ? 'clients' : 'suppliers'}/${entityId}/documents`;
    return path ? `${baseUrl}/${path}` : baseUrl;
  }

  /**
   * Validate file before upload
   */
  protected validateFile(file: File): string[] {
    const errors: string[] = [];

    // Size validation (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      errors.push(`Le fichier est trop volumineux. Taille maximum: 10MB`);
    }

    // Type validation
    const allowedTypes = [
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      // Images
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/bmp',
      'image/svg+xml',
      'image/webp',
      // Text
      'text/plain',
      'text/csv',
      'application/rtf'
    ];

    if (!allowedTypes.includes(file.type)) {
      errors.push(`Type de fichier non supporté: ${file.type}`);
    }

    return errors;
  }

  /**
   * Build FormData for file upload
   */
  protected buildFormData(request: CreateDocumentRequest): FormData {
    const formData = new FormData();
    formData.append('file', request.file);
    formData.append('title', request.title);
    formData.append('category', request.category);

    if (request.description) {
      formData.append('description', request.description);
    }

    return formData;
  }
}

/**
 * Upload progress callback type
 */
export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

/**
 * Upload options with progress tracking
 */
export interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  signal?: AbortSignal; // For cancellation
}

/**
 * Extended document repository with upload progress
 */
export abstract class DocumentRepositoryWithProgress extends DocumentRepository {
  /**
   * Upload with progress tracking
   */
  abstract uploadWithProgress(
    entityId: number,
    request: CreateDocumentRequest,
    options?: UploadOptions
  ): Observable<DocumentEntity>;
}

/**
 * Document search and filter utilities
 */
export class DocumentFiltersBuilder {
  private filters: DocumentFilters = {};

  category(category: string): DocumentFiltersBuilder {
    if (category && category !== 'all') {
      this.filters.category = category as any;
    }
    return this;
  }

  sortBy(field: string, order: 'asc' | 'desc' = 'asc'): DocumentFiltersBuilder {
    if (field) {
      this.filters.sort = field as any;
      this.filters.order = order;
    }
    return this;
  }

  latestOnly(value: boolean = true): DocumentFiltersBuilder {
    this.filters.latest_only = value;
    return this;
  }

  build(): DocumentFilters {
    return { ...this.filters };
  }

  static create(): DocumentFiltersBuilder {
    return new DocumentFiltersBuilder();
  }
}