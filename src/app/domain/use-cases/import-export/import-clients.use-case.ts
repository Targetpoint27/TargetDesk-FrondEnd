import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ImportExportRepository } from '../../repositories/import-export.repository';
import { ImportRequest, ImportResponse } from '../../models/import-export.models';

@Injectable({
  providedIn: 'root'
})
export class ImportClientsUseCase {
  private readonly importExportRepository = inject(ImportExportRepository);

  execute(request: ImportRequest): Observable<ImportResponse> {
    if (!request.file) {
      throw new Error('Fichier requis pour l\'import');
    }

    if (!request.mapping || Object.keys(request.mapping).length === 0) {
      throw new Error('Mapping des colonnes requis');
    }

    const supportedTypes = ['text/csv', 'application/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (!supportedTypes.includes(request.file.type)) {
      throw new Error('Format de fichier non supporté. Utilisez CSV ou Excel.');
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (request.file.size > maxSize) {
      throw new Error('Le fichier ne peut pas dépasser 10MB');
    }

    const validActions = ['ignore', 'replace', 'update'];
    if (!validActions.includes(request.duplicate_action)) {
      throw new Error('Action pour doublons invalide. Utilisez: ignore, replace ou update');
    }

    const requiredFields = ['name', 'type', 'email'];
    const missingFields = requiredFields.filter(field => !request.mapping[field]);
    if (missingFields.length > 0) {
      throw new Error(`Champs obligatoires manquants dans le mapping: ${missingFields.join(', ')}`);
    }

    return this.importExportRepository.importClients(request);
  }
}