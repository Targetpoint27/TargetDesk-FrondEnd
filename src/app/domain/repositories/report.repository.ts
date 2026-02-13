import { Observable } from 'rxjs';
import { DailyActivityReport } from '../models/report.model';

export abstract class ReportRepository {
  /**
   * Fetches the daily activity report for a specific agent and date
   * @param date Format YYYY-MM-DD (Défaut: Aujourd'hui)
   */
  abstract getDailyReport(date?: string): Observable<DailyActivityReport>;
}