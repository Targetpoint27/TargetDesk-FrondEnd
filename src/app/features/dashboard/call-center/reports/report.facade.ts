import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { GetDailyReportUseCase } from '../../../../domain/use-cases/report/get-daily-report.use-case';
import { DailyActivityReport } from '../../../../domain/models/report.model';
import { LoggingService } from '../../../../core/logging/logging.service';

@Injectable({
  providedIn: 'root'
})
export class ReportFacade {
  private reportSubject = new BehaviorSubject<DailyActivityReport | null>(null);
  public report$ = this.reportSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  public isLoading$ = this.loadingSubject.asObservable();

  constructor(
    private getDailyReportUseCase: GetDailyReportUseCase,
    private loggingService: LoggingService
  ) {}

  /**
   * Loads the report for a specific date and updates the state
   */
  loadDailyReport(date?: string): void {
    this.loadingSubject.next(true);
    
    this.getDailyReportUseCase.execute(date)
      .pipe(finalize(() => this.loadingSubject.next(false)))
      .subscribe({
        next: (report) => this.reportSubject.next(report),
        error: (err) => {
          this.loggingService.error('ReportFacade: Failed to load daily report', err);
          this.reportSubject.next(null);
        }
      });
  }
}