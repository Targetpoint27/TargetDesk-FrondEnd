export interface DailyReportSummary {
  total_treated: number;
  total_closed: number;
  total_in_progress: number;
  total_time_seconds: number;
  avg_time_per_call: string; // Format "00:04:00"
}

export interface DailyReportGraphs {
  by_status: { [key: string]: number };
  by_type: { [key: string]: number };
}

export interface DailyReportCall {
  id: number;
  time: string; // "H:i"
  type: string;
  caller: string;
  object: string;
  status: string;
  duration: number;
}

export interface DailyActivityReport {
  date: string;
  summary: DailyReportSummary;
  graphs: DailyReportGraphs;
  calls: DailyReportCall[];
}