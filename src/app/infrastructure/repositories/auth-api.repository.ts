import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { AuthRepository } from '../../domain/repositories/auth.repository';
import { AuthEntity } from '../../domain/entities/auth.entity';
import { UserEntity } from '../../domain/entities/user.entity';
import { LoginRequest } from '../../domain/models/auth.models';
import { ApiService } from '../../core/api/api.service';
import { ErrorService, AppError } from '../../core/error/error.service';
import { LoggingService } from '../../core/logging/logging.service';
import { EnvironmentService } from '../../core/config/environment.service';
import { AuthMapper } from '../mappers/auth.mapper';
import {
  LoginApiResponse,
  LogoutApiResponse,
  RefreshTokenApiResponse,
  CurrentUserApiResponse
} from '../api/auth-api.models';

@Injectable({
  providedIn: 'root'
})
export class AuthApiRepository extends AuthRepository {
  constructor(
    private apiService: ApiService,
    private authMapper: AuthMapper,
    private errorService: ErrorService,
    private loggingService: LoggingService,
    private environmentService: EnvironmentService
  ) {
    super();
  }

  login(credentials: LoginRequest): Observable<AuthEntity> {
    this.loggingService.info('Auth API: Login request', {
      component: 'AuthApiRepository',
      action: 'login',
      data: { email: credentials.email }
    });

    return this.apiService.post<LoginApiResponse>('/auth/login', credentials)
      .pipe(
        map(response => {
          // Extract the actual response body (HTTP response wrapper)
          const responseBody = (response as any).body || response;

          this.loggingService.debug('Auth API: Raw response received', {
            component: 'AuthApiRepository',
            action: 'login',
            data: {
              responseBody: JSON.stringify(responseBody, null, 2),
              responseData: responseBody.data ? JSON.stringify(responseBody.data, null, 2) : 'No data'
            }
          });

          if (!responseBody.success) {
            throw new AppError(
              'AUTHENTICATION_ERROR',
              responseBody.message || 'Login failed',
              responseBody.message || 'Login failed'
            );
          }

          if (!this.authMapper.validateAuthApiResponse(responseBody.data)) {
            this.loggingService.error('Auth API: Response validation failed', {
              component: 'AuthApiRepository',
              action: 'login',
              data: {
                responseData: responseBody.data,
                expectedStructure: {
                  token: 'string',
                  user: {
                    id: 'string',
                    name: 'string',
                    email: 'string',
                    created_at: 'string',
                    updated_at: 'string'
                  }
                }
              }
            });
            throw new AppError(
              'API_ERROR',
              'Invalid authentication response format',
              'Invalid authentication response format'
            );
          }

          return this.authMapper.toDomain(responseBody.data);
        }),
        tap(auth => {
          this.storeTokens(auth.token, auth.refreshToken);
          this.storeUser(auth.user);

          this.loggingService.info('Auth API: Login successful', {
            component: 'AuthApiRepository',
            action: 'login',
            userId: auth.user.id,
            data: {
              userId: auth.user.id,
              expiresAt: auth.expiresAt.toISOString()
            }
          });
        })
      );
  }


  logout(): Observable<void> {
    this.loggingService.info('Auth API: Logout request', {
      component: 'AuthApiRepository',
      action: 'logout'
    });

    return this.apiService.post<LogoutApiResponse>('/auth/logout')
      .pipe(
        map(response => {
          const apiResponse = this.apiService.unwrapApiResponse<LogoutApiResponse>(response);

          if (!apiResponse.success) {
            // Even if API logout fails, we still clean local storage
            this.loggingService.warn('API logout failed, but cleaning local storage', {
              component: 'AuthApiRepository',
              action: 'logout',
              data: { message: apiResponse.message }
            });
          }

          return void 0;
        }),
        tap(() => {
          this.clearStoredAuth();

          this.loggingService.info('Auth API: Logout completed', {
            component: 'AuthApiRepository',
            action: 'logout'
          });
        }),
        catchError(error => {
          // Même en cas d'erreur réseau, nettoyer le stockage local
          this.loggingService.warn('Auth API: Logout API call failed, cleaning local storage anyway', {
            component: 'AuthApiRepository',
            action: 'logout',
            data: { error: error.message }
          });

          this.clearStoredAuth();

          // Retourner succès car le nettoyage local est fait
          return new Observable<void>(observer => {
            observer.next();
            observer.complete();
          });
        })
      );
  }

  refreshToken(refreshToken: string): Observable<AuthEntity> {
    this.loggingService.info('Auth API: Refresh token request', {
      component: 'AuthApiRepository',
      action: 'refreshToken'
    });

    return this.apiService.post<RefreshTokenApiResponse>('/auth/refresh', { refresh_token: refreshToken })
      .pipe(
        map(response => {
          const apiResponse = this.apiService.unwrapApiResponse<RefreshTokenApiResponse>(response);

          if (!apiResponse.success) {
            throw new Error(apiResponse.message || 'Token refresh failed');
          }

          // Get current user from storage and create new auth entity
          const currentUser = this.getStoredUser();
          if (!currentUser) {
            throw new Error('No user found for token refresh');
          }

          const expiresAt = new Date(Date.now() + (apiResponse.data.expires_in * 1000));

          return AuthEntity.create({
            user: currentUser,
            token: apiResponse.data.token,
            refreshToken,
            expiresAt
          });
        }),
        tap(auth => {
          this.storeTokens(auth.token, auth.refreshToken);

          this.loggingService.info('Auth API: Token refresh successful', {
            component: 'AuthApiRepository',
            action: 'refreshToken',
            userId: auth.user.id,
            data: {
              userId: auth.user.id,
              expiresAt: auth.expiresAt.toISOString()
            }
          });
        })
      );
  }

  getCurrentUser(): Observable<UserEntity> {
    this.loggingService.info('Auth API: Get current user request', {
      component: 'AuthApiRepository',
      action: 'getCurrentUser'
    });

    return this.apiService.get<CurrentUserApiResponse>('/auth/user')
      .pipe(
        map(response => {
          const apiResponse = this.apiService.unwrapApiResponse<CurrentUserApiResponse>(response);

          if (!apiResponse.success) {
            throw new Error(apiResponse.message || 'Failed to get current user');
          }

          if (!this.authMapper.validateUserApiResponse(apiResponse.data)) {
            throw new Error('Invalid user response format');
          }

          return this.authMapper.mapUserToDomain(apiResponse.data);
        }),
        tap(user => {
          this.storeUser(user);

          this.loggingService.info('Auth API: Current user retrieved', {
            component: 'AuthApiRepository',
            action: 'getCurrentUser',
            userId: user.id,
            data: { userId: user.id }
          });
        })
      );
  }

  validateToken(token: string): Observable<boolean> {
    this.loggingService.info('Auth API: Validate token request', {
      component: 'AuthApiRepository',
      action: 'validateToken'
    });

    return this.apiService.get('/auth/validate', {
      headers: { 'Authorization': `Bearer ${token}` },
      skipErrorHandling: true
    }).pipe(
      map(() => {
        this.loggingService.info('Auth API: Token is valid', {
          component: 'AuthApiRepository',
          action: 'validateToken'
        });
        return true;
      })
    );
  }

  // Private helper methods for token/user storage
  private storeTokens(token: string, refreshToken: string): void {
    localStorage.setItem(this.environmentService.auth.tokenKey, token);
    localStorage.setItem(this.environmentService.auth.refreshTokenKey, refreshToken);
  }

  private storeUser(user: UserEntity): void {
    localStorage.setItem(this.environmentService.auth.userKey, JSON.stringify(user.toJSON()));
  }

  private getStoredUser(): UserEntity | null {
    try {
      const userData = localStorage.getItem(this.environmentService.auth.userKey);
      if (!userData) return null;

      const parsedData = JSON.parse(userData);
      return UserEntity.create({
        id: parsedData.id,
        name: parsedData.name,
        email: parsedData.email,
        emailVerified: parsedData.emailVerified,
        createdAt: new Date(parsedData.createdAt),
        updatedAt: new Date(parsedData.updatedAt)
      });
    } catch (error) {
      this.loggingService.warn('Failed to get stored user', {
        component: 'AuthApiRepository',
        action: 'getStoredUser',
        data: { error: error instanceof Error ? error.message : error }
      });
      return null;
    }
  }

  private clearStoredAuth(): void {
    // Nettoyer les clés d'authentification principales
    localStorage.removeItem(this.environmentService.auth.tokenKey);
    localStorage.removeItem(this.environmentService.auth.refreshTokenKey);
    localStorage.removeItem(this.environmentService.auth.userKey);

    // Nettoyer également les clés de la facade (pour éviter les doublons)
    localStorage.removeItem('targetdesk_auth');
    localStorage.removeItem('targetdesk_token');

    // Nettoyer toutes les clés liées à TargetDesk
    const targetDeskKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('targetdesk_')) {
        targetDeskKeys.push(key);
      }
    }

    targetDeskKeys.forEach(key => {
      localStorage.removeItem(key);
    });

    this.loggingService.debug('Stored auth data cleared completely', {
      component: 'AuthApiRepository',
      action: 'clearStoredAuth',
      data: { clearedKeys: targetDeskKeys }
    });
  }
}