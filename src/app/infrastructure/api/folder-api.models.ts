/**
 * Folder API Models
 * Data Transfer Objects for folder API communication
 */

// Base folder API response structure
export interface FolderApiResponse {
  id: number;
  name: string;
  path: string;
  level: number;
  parent_path: string | null;
  client_id: number;
  document_count?: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

// Folder list API response
export interface FolderListApiResponse {
  data: FolderApiResponse[];
  message?: string;
  success: boolean;
}

// Create folder API request
export interface CreateFolderApiRequest {
  name: string;
  path: string;
  parent_path?: string;
  description?: string;
}

// Update folder API request
export interface UpdateFolderApiRequest {
  name?: string;
  description?: string;
}

// Folder stats API response
export interface FolderStatsApiResponse {
  document_count: number;
  size_mb?: number;
  last_activity?: string;
}

// Error response for folder operations
export interface FolderApiError {
  message: string;
  errors?: {
    [field: string]: string[];
  };
  status: number;
}

// Folder search API parameters
export interface FolderSearchApiParams {
  client_id: number;
  include_counts?: boolean;
  parent_path?: string;
  max_level?: number;
}