import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ReportRepository } from '../../repositories/report.repository';
import { DailyActivityReport } from '../../models/report.model';

@Injectable({
  providedIn: 'root'
})
export class GetDailyReportUseCase {
  constructor(private reportRepository: ReportRepository) {}

  execute(date?: string): Observable<DailyActivityReport> {
    return this.reportRepository.getDailyReport(date);
  }
}