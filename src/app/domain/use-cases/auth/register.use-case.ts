import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { AuthRepository } from '../../repositories/auth.repository';
import { AuthEntity } from '../../entities/auth.entity';
import { RegisterRequest, RegisterEvent } from '../../models/auth.models';
import { LoggingService } from '../../../core/logging/logging.service';

export interface RegisterUseCaseResult {
  auth: AuthEntity;
  requiresEmailVerification: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class RegisterUseCase {
  constructor(
    private authRepository: AuthRepository,
    private loggingService: LoggingService
  ) {}

  execute(userData: RegisterRequest): Observable<RegisterUseCaseResult> {
    // Validate business rules
    this.validateRegistrationData(userData);

    this.loggingService.info('Registration attempt started', {
      component: 'RegisterUseCase',
      action: 'execute',
      data: {
        email: userData.email,
        name: userData.name
      }
    });

    return this.authRepository.register(userData).pipe(
      map(auth => ({
        auth,
        requiresEmailVerification: !auth.user.emailVerified
      })),
      tap(result => {
        this.loggingService.info('Registration successful', {
          component: 'RegisterUseCase',
          action: 'execute',
          userId: result.auth.user.id,
          data: {
            userId: result.auth.user.id,
            userName: result.auth.user.name,
            userEmail: result.auth.user.email,
            requiresEmailVerification: result.requiresEmailVerification
          }
        });

        // Emit domain event
        const registerEvent = new RegisterEvent(result.auth.user.id, {
          registrationTime: new Date(),
          emailVerified: result.auth.user.emailVerified
        });

        this.logDomainEvent(registerEvent);
      })
    );
  }

  private validateRegistrationData(userData: RegisterRequest): void {
    // Business validation rules
    if (userData.password !== userData.password_confirmation) {
      throw new Error('Password confirmation does not match');
    }

    if (userData.password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    if (!this.isValidEmail(userData.email)) {
      throw new Error('Invalid email format');
    }

    if (userData.name.trim().length < 2) {
      throw new Error('Name must be at least 2 characters long');
    }

    // Basic password length check (detailed validation done by backend)
    if (userData.password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }


  private logDomainEvent(event: RegisterEvent): void {
    this.loggingService.info('Domain event: User registered', {
      component: 'RegisterUseCase',
      action: 'domainEvent',
      userId: event.userId,
      data: {
        eventType: event.type,
        timestamp: event.timestamp,
        context: event.context
      }
    });

    // TODO: Publish to event bus for other bounded contexts
    // This could trigger welcome email, analytics, etc.
  }
}