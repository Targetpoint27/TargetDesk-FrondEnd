import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { AuthRepository } from '../../repositories/auth.repository';
import { AuthEntity } from '../../entities/auth.entity';
import { LoginRequest, LoginEvent } from '../../models/auth.models';
import { LoggingService } from '../../../core/logging/logging.service';

export interface LoginUseCaseResult {
  auth: AuthEntity;
  isFirstLogin: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class LoginUseCase {
  constructor(
    private authRepository: AuthRepository,
    private loggingService: LoggingService
  ) {}

  execute(credentials: LoginRequest): Observable<LoginUseCaseResult> {
    this.loggingService.info('Login attempt started', {
      component: 'LoginUseCase',
      action: 'execute',
      data: { email: credentials.email }
    });

    return this.authRepository.login(credentials).pipe(
      map(auth => ({
        auth,
        isFirstLogin: this.isFirstLogin(auth)
      })),
      tap(result => {
        this.loggingService.info('Login successful', {
          component: 'LoginUseCase',
          action: 'execute',
          userId: result.auth.user.id,
          data: {
            userId: result.auth.user.id,
            userName: result.auth.user.name,
            isFirstLogin: result.isFirstLogin
          }
        });

        // Emit domain event
        const loginEvent = new LoginEvent(result.auth.user.id, {
          isFirstLogin: result.isFirstLogin,
          loginTime: new Date()
        });

        this.logDomainEvent(loginEvent);
      })
    );
  }

  private isFirstLogin(auth: AuthEntity): boolean {
    // Business logic to determine if this is the user's first login
    // This could be based on user creation date vs current date, presence of profile completion, etc.
    const accountAge = Date.now() - auth.user.createdAt.getTime();
    const fifteenMinutes = 15 * 60 * 1000;

    // Consider it a first login if account was created less than 15 minutes ago
    return accountAge < fifteenMinutes;
  }

  private logDomainEvent(event: LoginEvent): void {
    this.loggingService.info('Domain event: User logged in', {
      component: 'LoginUseCase',
      action: 'domainEvent',
      userId: event.userId,
      data: {
        eventType: event.type,
        timestamp: event.timestamp,
        context: event.context
      }
    });

    // TODO: Publish to event bus/message broker for other bounded contexts
  }
}