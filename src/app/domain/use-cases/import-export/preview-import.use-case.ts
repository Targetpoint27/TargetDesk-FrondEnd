import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ImportExportRepository } from '../../repositories/import-export.repository';
import { ImportPreviewRequest, ImportPreviewResponse } from '../../models/import-export.models';

@Injectable({
  providedIn: 'root'
})
export class PreviewImportUseCase {
  private readonly importExportRepository = inject(ImportExportRepository);

  execute(request: ImportPreviewRequest): Observable<ImportPreviewResponse> {
    if (!request.file) {
      throw new Error('Fichier requis pour la prévisualisation');
    }

    const supportedTypes = ['text/csv', 'application/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (!supportedTypes.includes(request.file.type)) {
      throw new Error('Format de fichier non supporté. Utilisez CSV ou Excel.');
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (request.file.size > maxSize) {
      throw new Error('Le fichier ne peut pas dépasser 10MB');
    }

    return this.importExportRepository.previewImport(request);
  }
}