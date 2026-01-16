import { Observable } from 'rxjs';
import {
  ImportPreviewRequest,
  ImportRequest,
  ImportPreviewResponse,
  ImportResponse,
  ExportRequest,
  TemplateRequest,
  ExportFormat
} from '../models/import-export.models';

export abstract class ImportExportRepository {
  abstract downloadTemplate(format: ExportFormat): Observable<Blob>;

  abstract previewImport(request: ImportPreviewRequest): Observable<ImportPreviewResponse>;

  abstract importClients(request: ImportRequest): Observable<ImportResponse>;

  abstract exportClients(request: ExportRequest): Observable<Blob>;
}