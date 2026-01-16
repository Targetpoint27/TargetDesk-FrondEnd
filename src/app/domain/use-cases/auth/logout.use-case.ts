import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthRepository } from '../../repositories/auth.repository';
import { LogoutEvent } from '../../models/auth.models';
import { LoggingService } from '../../../core/logging/logging.service';

@Injectable({
  providedIn: 'root'
})
export class LogoutUseCase {
  constructor(
    private authRepository: AuthRepository,
    private loggingService: LoggingService
  ) {}

  execute(userId?: string): Observable<void> {
    this.loggingService.info('Logout attempt started', {
      component: 'LogoutUseCase',
      action: 'execute',
      userId,
      data: { userId }
    });

    return this.authRepository.logout().pipe(
      tap(() => {
        this.loggingService.info('Logout successful', {
          component: 'LogoutUseCase',
          action: 'execute',
          userId,
          data: {
            userId,
            logoutTime: new Date()
          }
        });

        // Emit domain event
        const logoutEvent = new LogoutEvent(userId, {
          logoutTime: new Date(),
          reason: 'user_initiated'
        });

        this.logDomainEvent(logoutEvent);
      })
    );
  }

  executeForced(userId: string, reason: string): Observable<void> {
    this.loggingService.warn('Forced logout initiated', {
      component: 'LogoutUseCase',
      action: 'executeForced',
      userId,
      data: {
        userId,
        reason
      }
    });

    return this.authRepository.logout().pipe(
      tap(() => {
        this.loggingService.warn('Forced logout completed', {
          component: 'LogoutUseCase',
          action: 'executeForced',
          userId,
          data: {
            userId,
            reason,
            logoutTime: new Date()
          }
        });

        // Emit domain event with forced context
        const logoutEvent = new LogoutEvent(userId, {
          logoutTime: new Date(),
          reason,
          forced: true
        });

        this.logDomainEvent(logoutEvent);
      })
    );
  }

  private logDomainEvent(event: LogoutEvent): void {
    this.loggingService.info('Domain event: User logged out', {
      component: 'LogoutUseCase',
      action: 'domainEvent',
      userId: event.userId,
      data: {
        eventType: event.type,
        timestamp: event.timestamp,
        context: event.context
      }
    });

    // TODO: Publish to event bus for other bounded contexts
    // This could trigger session cleanup, analytics, etc.
  }
}