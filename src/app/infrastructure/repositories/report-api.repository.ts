import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService, ApiResponse } from '../../core/api/api.service';
import { ReportRepository } from '../../domain/repositories/report.repository';
import { DailyActivityReport } from '../../domain/models/report.model';

@Injectable({
  providedIn: 'root'
})
export class ReportApiRepository extends ReportRepository {
  private readonly BASE_PATH = '/call-center/reports';

  constructor(private apiService: ApiService) {
    super();
  }

  getDailyReport(date?: string): Observable<DailyActivityReport> {
    const params: any = {};
    if (date) {
      params.date = date;
    }

    return this.apiService
      .get<ApiResponse<DailyActivityReport>>(`${this.BASE_PATH}/daily`, { params })
      .pipe(
        map(response => response.data)
      );
  }
}