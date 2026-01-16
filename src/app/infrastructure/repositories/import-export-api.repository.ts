import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { HttpParams, HttpErrorResponse } from '@angular/common/http';

import { ImportExportRepository } from '../../domain/repositories/import-export.repository';
import {
  ImportPreviewRequest,
  ImportRequest,
  ImportPreviewResponse,
  ImportResponse,
  ExportRequest,
  ExportFormat
} from '../../domain/models/import-export.models';
import { ApiService } from '../../core/api/api.service';
import { AppError } from '../../core/error/error.service';

@Injectable({
  providedIn: 'root'
})
export class ImportExportApiRepository extends ImportExportRepository {
  private readonly endpoint = 'clients';

  constructor(private apiService: ApiService) {
    super();
  }

  downloadTemplate(format: ExportFormat): Observable<Blob> {
    const templateEndpoint = format === 'excel'
      ? `${this.endpoint}/export/template/excel`
      : `${this.endpoint}/export/template`;

    return this.apiService.get<Blob>(templateEndpoint, {
      responseType: 'blob' as 'json'
    }).pipe(
      catchError(error => this.handleError(error, 'Erreur lors du téléchargement du modèle'))
    );
  }

  previewImport(request: ImportPreviewRequest): Observable<ImportPreviewResponse> {
    const formData = new FormData();
    formData.append('file', request.file);

    if (request.mapping) {
      Object.entries(request.mapping).forEach(([key, value]) => {
        formData.append(`mapping[${key}]`, value);
      });
    }

    return this.apiService.post<ImportPreviewResponse>(
      `${this.endpoint}/import/preview`,
      formData
    ).pipe(
      catchError(error => this.handleError(error, 'Erreur lors de la prévisualisation'))
    );
  }

  importClients(request: ImportRequest): Observable<ImportResponse> {
    const formData = new FormData();
    formData.append('file', request.file);
    formData.append('duplicate_action', request.duplicate_action);

    Object.entries(request.mapping).forEach(([key, value]) => {
      formData.append(`mapping[${key}]`, value);
    });

    return this.apiService.post<ImportResponse>(
      `${this.endpoint}/import`,
      formData
    ).pipe(
      catchError(error => this.handleError(error, 'Erreur lors de l\'import'))
    );
  }

  exportClients(request: ExportRequest): Observable<Blob> {
    return this.apiService.post<Blob>(
      `${this.endpoint}/export`,
      request,
      { responseType: 'blob' as 'json' }
    ).pipe(
      catchError(error => this.handleError(error, 'Erreur lors de l\'export'))
    );
  }

  private handleError(error: any, defaultMessage: string): Observable<never> {
    console.error('ImportExportApiRepository Error:', error);

    if (error instanceof HttpErrorResponse) {
      if (error.status === 422 && error.error) {
        try {
          const errorData = typeof error.error === 'string' ? JSON.parse(error.error) : error.error;
          if (errorData.errors) {
            const message = Object.values(errorData.errors).flat().join(', ');
            return throwError(() => new AppError('VALIDATION_ERROR', message, message, errorData.errors));
          }
          return throwError(() => new AppError('VALIDATION_ERROR', errorData.message || defaultMessage, errorData.message || defaultMessage));
        } catch {
          return throwError(() => new AppError('VALIDATION_ERROR', defaultMessage, defaultMessage));
        }
      }

      if (error.status === 401) {
        return throwError(() => new AppError('UNAUTHORIZED', 'Session expirée, veuillez vous reconnecter', 'Session expirée, veuillez vous reconnecter'));
      }

      if (error.status === 403) {
        return throwError(() => new AppError('FORBIDDEN', 'Vous n\'avez pas les droits pour effectuer cette action', 'Vous n\'avez pas les droits pour effectuer cette action'));
      }

      if (error.status === 404) {
        return throwError(() => new AppError('NOT_FOUND', 'Ressource non trouvée', 'Ressource non trouvée'));
      }

      if (error.status >= 500) {
        return throwError(() => new AppError('SERVER_ERROR', 'Erreur serveur, veuillez réessayer plus tard', 'Erreur serveur, veuillez réessayer plus tard'));
      }
    }

    return throwError(() => new AppError('UNKNOWN_ERROR', defaultMessage, defaultMessage));
  }
}