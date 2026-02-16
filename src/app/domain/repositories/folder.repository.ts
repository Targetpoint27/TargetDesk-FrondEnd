/**
 * Folder Repository Interface
 * Defines operations for folder data access
 */

import { Observable } from 'rxjs';
import { FolderEntity } from '../entities/folder.entity';
import {
  CreateFolderRequest,
  UpdateFolderRequest,
  FolderSearchParams
} from '../models/folder.models';

export abstract class FolderRepository {
  /**
   * Create a new folder for a client
   */
  abstract create(clientId: number, request: CreateFolderRequest): Observable<FolderEntity>;

  /**
   * Update an existing folder
   */
  abstract update(clientId: number, folderPath: string, request: UpdateFolderRequest): Observable<FolderEntity>;

  /**
   * Delete a folder and all its contents
   */
  abstract delete(clientId: number, folderPath: string): Observable<void>;

  /**
   * Get folders by client with optional filtering
   */
  abstract getByClient(params: FolderSearchParams): Observable<FolderEntity[]>;

  /**
   * Get a specific folder by path
   */
  abstract getByPath(clientId: number, folderPath: string): Observable<FolderEntity | null>;

  /**
   * Check if a folder exists
   */
  abstract exists(clientId: number, folderPath: string): Observable<boolean>;

  /**
   * Get folder statistics (document count, etc.)
   */
  abstract getStats(clientId: number, folderPath: string): Observable<{ document_count: number }>;
}