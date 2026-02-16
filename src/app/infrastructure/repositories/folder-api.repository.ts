/**
 * Folder API Repository Implementation
 * Implements FolderRepository using HTTP API calls
 */

import { Injectable } from '@angular/core';
import { Observable, map, catchError } from 'rxjs';
import { HttpParams } from '@angular/common/http';

import { FolderRepository } from '../../domain/repositories/folder.repository';
import { FolderEntity } from '../../domain/entities/folder.entity';
import { ApiService } from '../../core/api/api.service';
import { FolderMapper } from '../mappers/folder.mapper';
import {
  CreateFolderRequest,
  UpdateFolderRequest,
  FolderSearchParams
} from '../../domain/models/folder.models';
import {
  FolderApiResponse,
  FolderListApiResponse,
  CreateFolderApiRequest,
  UpdateFolderApiRequest,
  FolderStatsApiResponse
} from '../api/folder-api.models';

@Injectable({
  providedIn: 'root'
})
export class FolderApiRepository extends FolderRepository {
  private readonly endpoint = 'folders';

  constructor(private apiService: ApiService) {
    super();
  }

  create(clientId: number, request: CreateFolderRequest): Observable<FolderEntity> {
    const apiRequest: CreateFolderApiRequest = {
      name: request.folder_name,
      path: request.parent_path ? `${request.parent_path}/${request.folder_name}` : request.folder_name,
      parent_path: request.parent_path,
      description: request.description
    };

    return this.apiService.post<FolderApiResponse>(`clients/${clientId}/${this.endpoint}`, apiRequest).pipe(
      map(response => FolderMapper.fromApiResponse(response))
    );
  }

  update(clientId: number, folderPath: string, request: UpdateFolderRequest): Observable<FolderEntity> {
    const apiRequest: UpdateFolderApiRequest = {
      name: request.folder_name,
      description: request.description
    };

    const encodedPath = encodeURIComponent(folderPath);
    return this.apiService.put<FolderApiResponse>(`clients/${clientId}/${this.endpoint}/${encodedPath}`, apiRequest).pipe(
      map(response => FolderMapper.fromApiResponse(response))
    );
  }

  delete(clientId: number, folderPath: string): Observable<void> {
    const encodedPath = encodeURIComponent(folderPath);
    return this.apiService.delete<void>(`clients/${clientId}/${this.endpoint}/${encodedPath}`);
  }

  getByClient(params: FolderSearchParams): Observable<FolderEntity[]> {
    let queryParams = new HttpParams();

    if (params.include_counts) {
      queryParams = queryParams.set('include_counts', 'true');
    }
    if (params.parent_path) {
      queryParams = queryParams.set('parent_path', params.parent_path);
    }
    if (params.max_level !== undefined) {
      queryParams = queryParams.set('max_level', params.max_level.toString());
    }

    return this.apiService.get<FolderListApiResponse>(`clients/${params.client_id}/${this.endpoint}`, { params: queryParams }).pipe(
      map(response => response.data.map(folder => FolderMapper.fromApiResponse(folder)))
    );
  }

  getByPath(clientId: number, folderPath: string): Observable<FolderEntity | null> {
    const encodedPath = encodeURIComponent(folderPath);
    return this.apiService.get<FolderApiResponse>(`clients/${clientId}/${this.endpoint}/${encodedPath}`).pipe(
      map(response => FolderMapper.fromApiResponse(response)),
      catchError(() => {
        // Return null if folder not found
        return new Observable<null>(observer => {
          observer.next(null);
          observer.complete();
        });
      })
    );
  }

  exists(clientId: number, folderPath: string): Observable<boolean> {
    return this.getByPath(clientId, folderPath).pipe(
      map(folder => folder !== null)
    );
  }

  getStats(clientId: number, folderPath: string): Observable<{ document_count: number }> {
    const encodedPath = encodeURIComponent(folderPath);
    return this.apiService.get<FolderStatsApiResponse>(`clients/${clientId}/${this.endpoint}/${encodedPath}/stats`).pipe(
      map(response => ({
        document_count: response.document_count
      }))
    );
  }
}