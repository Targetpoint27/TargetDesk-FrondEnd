export interface ImportPreviewRequest {
  file: File;
  mapping?: Record<string, string>;
}

export interface ImportRequest {
  file: File;
  mapping: Record<string, string>;
  duplicate_action: 'ignore' | 'replace' | 'update';
}

export interface ImportPreviewResponse {
  success: boolean;
  message: string;
  data: {
    preview: ImportPreviewRow[];
    stats: ImportStats;
    errors: ImportError[];
    duplicates: ImportDuplicate[];
  };
}

export interface ImportResponse {
  success: boolean;
  message: string;
  data: {
    report: ImportReport;
  };
}

export interface ImportPreviewRow {
  row_number: number;
  data: Partial<ClientData>;
  validation: {
    is_valid: boolean;
    errors: string[];
  };
  duplicate: {
    is_duplicate: boolean;
    conflicts: string[];
  };
}

export interface ImportStats {
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  duplicates_found: number;
}

export interface ImportError {
  row_number: number;
  validation: {
    errors: Record<string, string[]>;
  };
}

export interface ImportDuplicate {
  row_number: number;
  duplicate: {
    conflicts: ImportConflict[];
  };
}

export interface ImportConflict {
  field: string;
  value: string;
  existing_client: {
    id: number;
    client_id: string;
    name: string;
    email: string;
  };
}

export interface ImportReport {
  total_rows: number;
  imported: number;
  updated: number;
  ignored: number;
  errors: Array<{
    row: number;
    errors: Record<string, string[]>;
  } | {
    row: number;
    error: string;
  }>;
  warnings: string[];
}

export interface ClientData {
  name: string;
  type: string;
  email: string;
  phone?: string;
  address?: string;
  siret?: string;
  sector?: string;
  website?: string;
  notes?: string;
}

export interface ExportRequest {
  format?: 'csv' | 'excel';
  columns?: string[];
  filters?: ExportFilters;
  client_ids?: number[];
  limit?: number;
}

export interface ExportFilters {
  type?: 'particulier' | 'entreprise';
  is_active?: boolean;
  search?: string;
}

export type ExportFormat = 'csv' | 'excel';

export interface TemplateRequest {
  format: ExportFormat;
}

export interface ImportMapping {
  [key: string]: string;
}

export type DuplicateAction = 'ignore' | 'replace' | 'update';

export interface ExportColumn {
  key: string;
  label: string;
  required?: boolean;
}

export const AVAILABLE_EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'client_id', label: 'ID Client', required: true },
  { key: 'name', label: 'Nom/Raison sociale', required: true },
  { key: 'type', label: 'Type', required: true },
  { key: 'email', label: 'Email', required: true },
  { key: 'phone', label: 'Téléphone' },
  { key: 'address', label: 'Adresse' },
  { key: 'siret', label: 'SIRET' },
  { key: 'sector', label: 'Secteur' },
  { key: 'website', label: 'Site web' },
  { key: 'notes', label: 'Notes' },
  { key: 'is_active', label: 'Statut' },
  { key: 'created_at', label: 'Date création' },
  { key: 'updated_at', label: 'Dernière modification' },
  { key: 'creator', label: 'Créateur' },
  { key: 'categories', label: 'Catégories' }
];

export const DEFAULT_IMPORT_MAPPING: ImportMapping = {
  name: 'name',
  type: 'type',
  email: 'email',
  phone: 'phone',
  address: 'address',
  siret: 'siret',
  sector: 'sector',
  website: 'website',
  notes: 'notes'
};