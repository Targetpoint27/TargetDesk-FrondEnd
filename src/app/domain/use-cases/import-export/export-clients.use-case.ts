import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ImportExportRepository } from '../../repositories/import-export.repository';
import { ExportRequest, AVAILABLE_EXPORT_COLUMNS } from '../../models/import-export.models';

@Injectable({
  providedIn: 'root'
})
export class ExportClientsUseCase {
  private readonly importExportRepository = inject(ImportExportRepository);

  execute(request: ExportRequest = {}): Observable<Blob> {
    const validatedRequest: ExportRequest = {
      format: request.format || 'csv',
      columns: request.columns || ['client_id', 'name', 'type', 'email', 'phone'],
      limit: request.limit || 10000,
      ...request
    };

    if (validatedRequest.limit && (validatedRequest.limit < 1 || validatedRequest.limit > 10000)) {
      throw new Error('La limite doit être entre 1 et 10 000 lignes');
    }

    if (validatedRequest.format && !['csv', 'excel'].includes(validatedRequest.format)) {
      throw new Error('Format invalide. Utilisez csv ou excel');
    }

    if (validatedRequest.columns) {
      const availableColumns = AVAILABLE_EXPORT_COLUMNS.map(col => col.key);
      const invalidColumns = validatedRequest.columns.filter(col => !availableColumns.includes(col));
      if (invalidColumns.length > 0) {
        throw new Error(`Colonnes invalides: ${invalidColumns.join(', ')}`);
      }
    }

    if (validatedRequest.filters?.type && !['particulier', 'entreprise'].includes(validatedRequest.filters.type)) {
      throw new Error('Type de client invalide. Utilisez particulier ou entreprise');
    }

    if (validatedRequest.client_ids && (!Array.isArray(validatedRequest.client_ids) || validatedRequest.client_ids.length === 0)) {
      throw new Error('La liste des IDs clients doit être un tableau non vide');
    }

    return this.importExportRepository.exportClients(validatedRequest);
  }
}