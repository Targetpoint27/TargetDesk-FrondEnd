import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthRepository } from '../../repositories/auth.repository';
import { UserEntity } from '../../entities/user.entity';
import { LoggingService } from '../../../core/logging/logging.service';

@Injectable({
  providedIn: 'root'
})
export class GetCurrentUserUseCase {
  constructor(
    private authRepository: AuthRepository,
    private loggingService: LoggingService
  ) {}

  execute(): Observable<UserEntity> {
    this.loggingService.info('Get current user attempt started', {
      component: 'GetCurrentUserUseCase',
      action: 'execute'
    });

    return this.authRepository.getCurrentUser().pipe(
      tap(user => {
        this.loggingService.info('Get current user successful', {
          component: 'GetCurrentUserUseCase',
          action: 'execute',
          userId: user.id,
          data: {
            userId: user.id,
            userName: user.name,
            userEmail: user.email
          }
        });
      })
    );
  }
}