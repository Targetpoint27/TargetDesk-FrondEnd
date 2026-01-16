import { Injectable } from '@angular/core';
import { EnvironmentService } from '../config/environment.service';

export interface LogContext {
  userId?: string;
  sessionId?: string;
  component?: string;
  action?: string;
  data?: any;
  timestamp?: Date;
}

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: LogContext;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class LoggingService {
  private logs: LogEntry[] = [];
  private readonly maxLogs = 1000;

  constructor(private environmentService: EnvironmentService) {}

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log('error', message, context);
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, context?: LogContext): void {
    if (!this.environmentService.shouldLog(level)) {
      return;
    }

    const logEntry: LogEntry = {
      level,
      message,
      context: {
        ...context,
        timestamp: new Date()
      },
      timestamp: new Date()
    };

    // Store in memory
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console logging
    if (this.environmentService.logging.enableConsole) {
      this.logToConsole(logEntry);
    }

    // Remote logging (if enabled)
    if (this.environmentService.logging.enableRemote) {
      this.logToRemote(logEntry);
    }
  }

  private logToConsole(entry: LogEntry): void {
    const contextStr = entry.context ? ` | Context: ${JSON.stringify(entry.context)}` : '';
    const logMessage = `[${entry.timestamp.toISOString()}] ${entry.message}${contextStr}`;

    switch (entry.level) {
      case 'debug':
        console.debug(logMessage);
        break;
      case 'info':
        console.info(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      case 'error':
        console.error(logMessage);
        break;
    }
  }

  private logToRemote(entry: LogEntry): void {
    // TODO: Implement remote logging (Sentry, CloudWatch, etc.)
    // For now, just store it for potential batch sending
  }

  getLogs(level?: 'debug' | 'info' | 'warn' | 'error'): LogEntry[] {
    return level ? this.logs.filter(log => log.level === level) : [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}