import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ImportExportRepository } from '../../repositories/import-export.repository';
import { ExportFormat } from '../../models/import-export.models';

@Injectable({
  providedIn: 'root'
})
export class DownloadTemplateUseCase {
  private readonly importExportRepository = inject(ImportExportRepository);

  execute(format: ExportFormat = 'csv'): Observable<Blob> {
    return this.importExportRepository.downloadTemplate(format);
  }
}