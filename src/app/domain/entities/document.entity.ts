/**
 * Document Entity - Generic Document Management
 * Supports both client and supplier documents
 */

export interface DocumentStatistics {
  total_documents: number;
  total_size: number;
  formatted_total_size: string;
  by_category: {
    contrat: number;
    devis: number;
    facture: number;
    autre: number;
  };
}

export interface DocumentMetadata {
  original_size: number;
  upload_ip: string;
  user_agent: string;
}

export interface DocumentUploader {
  id: number;
  name: string;
}

export interface DocumentOwner {
  id: number;
  name: string;
  client_id?: string; // For clients
  supplier_id?: string; // For suppliers
}

export type DocumentCategory = 'contrat' | 'devis' | 'facture' | 'autre';
export type DocumentSortField = 'name' | 'date' | 'type' | 'category' | 'size';
export type SortOrder = 'asc' | 'desc';

export interface DocumentEntity {
  id: number;
  client_id?: number; // For client documents
  supplier_id?: number; // For supplier documents
  uploaded_by: number;
  title: string;
  description: string | null;
  category: DocumentCategory;
  original_name: string;
  file_path: string;
  mime_type: string;
  file_size: number;
  file_extension: string;
  version: number;
  document_key: string;
  metadata: DocumentMetadata;
  is_active: boolean;
  last_accessed_at: string | null;
  created_at: string;
  updated_at: string;
  formatted_size: string;
  download_url: string;
  preview_url: string;
  can_preview: boolean;
  uploader: DocumentUploader;
  client?: DocumentOwner; // For client documents
  supplier?: DocumentOwner; // For supplier documents
}

export interface DocumentVersion {
  id: number;
  version: number;
  is_active: boolean;
  title: string;
  created_at: string;
  formatted_size: string;
  uploader: DocumentUploader;
}

export interface DocumentListResponse {
  documents: DocumentEntity[];
  statistics: DocumentStatistics;
}

export interface DocumentFilters {
  category?: DocumentCategory;
  sort?: DocumentSortField;
  order?: SortOrder;
  latest_only?: boolean;
}

export interface CreateDocumentRequest {
  file: File;
  title: string;
  description?: string;
  category: DocumentCategory;
}

export interface UpdateDocumentRequest {
  title?: string;
  description?: string;
  category?: DocumentCategory;
}

export type EntityType = 'client' | 'supplier';

/**
 * Generic document entity for both clients and suppliers
 */
export class Document {
  constructor(
    public readonly id: number,
    public readonly entityType: EntityType,
    public readonly entityId: number,
    public readonly uploadedBy: number,
    public title: string,
    public description: string | null,
    public category: DocumentCategory,
    public readonly originalName: string,
    public readonly filePath: string,
    public readonly mimeType: string,
    public readonly fileSize: number,
    public readonly fileExtension: string,
    public readonly version: number,
    public readonly documentKey: string,
    public readonly metadata: DocumentMetadata,
    public readonly isActive: boolean,
    public readonly lastAccessedAt: Date | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly formattedSize: string,
    public readonly downloadUrl: string,
    public readonly previewUrl: string,
    public readonly canPreview: boolean,
    public readonly uploader: DocumentUploader,
    public readonly owner: DocumentOwner
  ) {}

  /**
   * Create Document instance from API response
   */
  static fromResponse(data: DocumentEntity): Document {
    return new Document(
      data.id,
      data.client_id ? 'client' : 'supplier',
      data.client_id || data.supplier_id!,
      data.uploaded_by,
      data.title,
      data.description,
      data.category,
      data.original_name,
      data.file_path,
      data.mime_type,
      data.file_size,
      data.file_extension,
      data.version,
      data.document_key,
      data.metadata,
      data.is_active,
      data.last_accessed_at ? new Date(data.last_accessed_at) : null,
      new Date(data.created_at),
      new Date(data.updated_at),
      data.formatted_size,
      data.download_url,
      data.preview_url,
      data.can_preview,
      data.uploader,
      data.client || data.supplier!
    );
  }

  /**
   * Get document type icon based on mime type
   */
  get iconClass(): string {
    if (this.mimeType.startsWith('image/')) return 'bi-file-image';
    if (this.mimeType === 'application/pdf') return 'bi-file-pdf';
    if (this.mimeType.includes('word')) return 'bi-file-word';
    if (this.mimeType.includes('excel') || this.mimeType.includes('spreadsheet')) return 'bi-file-excel';
    if (this.mimeType.includes('powerpoint') || this.mimeType.includes('presentation')) return 'bi-file-ppt';
    if (this.mimeType.startsWith('text/')) return 'bi-file-text';
    return 'bi-file-earmark';
  }

  /**
   * Get category display name and color
   */
  get categoryInfo(): { label: string; color: string } {
    const categories = {
      contrat: { label: 'Contrat', color: 'primary' },
      devis: { label: 'Devis', color: 'info' },
      facture: { label: 'Facture', color: 'success' },
      autre: { label: 'Autre', color: 'secondary' }
    };
    return categories[this.category];
  }

  /**
   * Check if document is an image
   */
  get isImage(): boolean {
    return this.mimeType.startsWith('image/');
  }

  /**
   * Check if document is a PDF
   */
  get isPdf(): boolean {
    return this.mimeType === 'application/pdf';
  }

  /**
   * Check if document was uploaded recently (last 24h)
   */
  get isRecent(): boolean {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    return this.createdAt > oneDayAgo;
  }

  /**
   * Update document metadata
   */
  updateMetadata(updates: UpdateDocumentRequest): Document {
    return new Document(
      this.id,
      this.entityType,
      this.entityId,
      this.uploadedBy,
      updates.title ?? this.title,
      updates.description ?? this.description,
      updates.category ?? this.category,
      this.originalName,
      this.filePath,
      this.mimeType,
      this.fileSize,
      this.fileExtension,
      this.version,
      this.documentKey,
      this.metadata,
      this.isActive,
      this.lastAccessedAt,
      this.createdAt,
      new Date(), // Updated timestamp
      this.formattedSize,
      this.downloadUrl,
      this.previewUrl,
      this.canPreview,
      this.uploader,
      this.owner
    );
  }
}