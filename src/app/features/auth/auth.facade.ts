import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { tap, catchError, map, finalize, switchMap } from 'rxjs/operators';
import { LoginUseCase, LoginUseCaseResult } from '../../domain/use-cases/auth/login.use-case';
import { LogoutUseCase } from '../../domain/use-cases/auth/logout.use-case';
import { AuthEntity } from '../../domain/entities/auth.entity';
import { UserEntity } from '../../domain/entities/user.entity';
import { LoginRequest } from '../../domain/models/auth.models';
import { MessageService } from '../../shared/services/message.service';
import { LoggingService } from '../../core/logging/logging.service';
import { AppError } from '../../core/error/error.service';
import { PermissionService } from '../../core/auth/permission.service';

export interface AuthState {
  isAuthenticated: boolean;
  user: UserEntity | null;
  isLoading: boolean;
  error: AppError | null;
  lastActivity: Date | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  isLoading: false,
  error: null,
  lastActivity: null
};

@Injectable({
  providedIn: 'root'
})
export class AuthFacade {
  private readonly STORAGE_KEY = 'targetdesk_auth';
  private readonly TOKEN_KEY = 'targetdesk_token';
  private state$ = new BehaviorSubject<AuthState>(initialState);

  // Public selectors
  public readonly isAuthenticated$ = this.state$.pipe(
    map(state => state.isAuthenticated)
  );

  public readonly user$ = this.state$.pipe(
    map(state => state.user)
  );

  public readonly isLoading$ = this.state$.pipe(
    map(state => state.isLoading)
  );

  public readonly error$ = this.state$.pipe(
    map(state => state.error)
  );

  public readonly authState$ = this.state$.asObservable();

  constructor(
    private loginUseCase: LoginUseCase,
    private logoutUseCase: LogoutUseCase,
    private messageService: MessageService,
    private loggingService: LoggingService,
    private permissionService: PermissionService
  ) {
    this.initializeAuthState();
  }

  // Public actions
  login$(credentials: LoginRequest): Observable<LoginUseCaseResult> {
    this.setLoading(true);
    this.clearError();

    this.loggingService.info('Auth Facade: Login initiated', {
      component: 'AuthFacade',
      action: 'login',
      data: { email: credentials.email }
    });

    return this.loginUseCase.execute(credentials).pipe(
      switchMap(result => {
        this.setAuthenticatedUser(result.auth);
        this.updateLastActivity();
        this.saveAuthToStorage(result.auth);

        // Load user permissions after successful login
        return this.permissionService.loadUserPermissions(result.auth.user.id).pipe(
          map(() => result),
          catchError(permissionError => {
            this.loggingService.warn('Auth Facade: Failed to load permissions on login', {
              component: 'AuthFacade',
              action: 'login',
              data: { error: permissionError.message }
            });
            // Don't fail login if permissions fail to load
            return of(result);
          })
        );
      }),
      tap(result => {
        this.messageService.showLoginSuccess(result.auth.user.getDisplayName());

        this.loggingService.info('Auth Facade: Login successful', {
          component: 'AuthFacade',
          action: 'login',
          userId: result.auth.user.id,
          data: {
            userId: result.auth.user.id,
            isFirstLogin: result.isFirstLogin
          }
        });
      }),
      catchError(error => {
        this.setError(error);

        // Only log the error, let the component handle the display
        this.loggingService.error('Auth Facade: Login failed', {
          component: 'AuthFacade',
          action: 'login',
          data: {
            error: error.message,
            email: credentials.email
          }
        });

        return throwError(() => error);
      }),
      finalize(() => this.setLoading(false))
    );
  }


  logout$(): Observable<void> {
    this.setLoading(true);
    const currentUser = this.getCurrentUser();

    this.loggingService.info('Auth Facade: Logout initiated', {
      component: 'AuthFacade',
      action: 'logout',
      userId: currentUser?.id
    });

    return this.logoutUseCase.execute(currentUser?.id).pipe(
      tap(() => {
        this.clearAuthenticatedUser();
        this.clearAuthFromStorage();
        this.permissionService.clearPermissions();
        this.messageService.showLogoutSuccess();

        this.loggingService.info('Auth Facade: Logout successful', {
          component: 'AuthFacade',
          action: 'logout',
          userId: currentUser?.id
        });
      }),
      catchError(error => {
        // Even if logout fails on server, clear local state
        this.clearAuthenticatedUser();
        this.clearAuthFromStorage();
        this.permissionService.clearPermissions();
        this.messageService.showWarning(
          'Déconnexion effectuée localement. Le serveur n\'a pas pu être contacté.',
          { duration: 5000 }
        );

        this.loggingService.warn('Auth Facade: Logout partially failed', {
          component: 'AuthFacade',
          action: 'logout',
          data: { error: error.message }
        });

        return of(void 0); // Return success despite server error
      }),
      finalize(() => this.setLoading(false))
    );
  }

  // Session management
  forceLogout(reason: string): void {
    const currentUser = this.getCurrentUser();

    this.loggingService.warn('Auth Facade: Force logout triggered', {
      component: 'AuthFacade',
      action: 'forceLogout',
      userId: currentUser?.id,
      data: { reason }
    });

    this.clearAuthenticatedUser();
    this.permissionService.clearPermissions();

    if (reason === 'token_expired') {
      this.messageService.showSessionExpired();
    } else {
      this.messageService.showWarning(
        'Votre session a été fermée pour des raisons de sécurité.',
        { title: 'Session fermée' }
      );
    }
  }

  // State getters
  getCurrentUser(): UserEntity | null {
    return this.state$.value.user;
  }

  isAuthenticated(): boolean {
    return this.state$.value.isAuthenticated;
  }

  isLoading(): boolean {
    return this.state$.value.isLoading;
  }

  getLastActivity(): Date | null {
    return this.state$.value.lastActivity;
  }

  // Activity tracking
  updateActivity(): void {
    if (this.isAuthenticated()) {
      this.updateLastActivity();
    }
  }

  // Private state management methods
  private initializeAuthState(): void {
    // Check if user is already authenticated from stored data
    const storedAuth = this.getAuthFromStorage();
    if (storedAuth && this.isTokenValid(storedAuth.token)) {
      this.setAuthenticatedUser(storedAuth);
      this.updateLastActivity();

      // Load user permissions on session restoration
      this.permissionService.loadUserPermissions(storedAuth.user.id).subscribe({
        next: () => {
          this.loggingService.info('Auth Facade: Session and permissions restored from storage', {
            component: 'AuthFacade',
            action: 'initializeAuthState',
            userId: storedAuth.user.id
          });
        },
        error: (error) => {
          this.loggingService.warn('Auth Facade: Failed to load permissions on session restore', {
            component: 'AuthFacade',
            action: 'initializeAuthState',
            userId: storedAuth.user.id,
            data: { error: error.message }
          });
        }
      });

      this.loggingService.info('Auth Facade: Session restored from storage', {
        component: 'AuthFacade',
        action: 'initializeAuthState',
        userId: storedAuth.user.id
      });
    } else {
      this.clearAuthFromStorage();
    }

    this.loggingService.debug('Auth Facade: Initializing auth state', {
      component: 'AuthFacade',
      action: 'initializeAuthState'
    });
  }

  private setAuthenticatedUser(auth: AuthEntity): void {
    this.updateState({
      isAuthenticated: true,
      user: auth.user,
      error: null
    });
  }

  private clearAuthenticatedUser(): void {
    this.updateState({
      isAuthenticated: false,
      user: null,
      error: null,
      lastActivity: null
    });
  }

  private setLoading(isLoading: boolean): void {
    this.updateState({ isLoading });
  }

  private setError(error: AppError): void {
    this.updateState({ error });
  }

  private clearError(): void {
    this.updateState({ error: null });
  }

  private updateLastActivity(): void {
    this.updateState({ lastActivity: new Date() });
  }

  private updateState(partialState: Partial<AuthState>): void {
    const currentState = this.state$.value;
    const newState = { ...currentState, ...partialState };
    this.state$.next(newState);
  }

  // Storage management methods
  private saveAuthToStorage(auth: AuthEntity): void {
    try {
      const authData = {
        user: {
          id: auth.user.id,
          name: auth.user.name,
          email: auth.user.email,
          isEmailVerified: auth.user.isEmailVerified,
          createdAt: auth.user.createdAt.toISOString(),
          updatedAt: auth.user.updatedAt.toISOString()
        },
        token: auth.token,
        expiresAt: auth.expiresAt.toISOString(),
        timestamp: new Date().toISOString()
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(authData));
      localStorage.setItem(this.TOKEN_KEY, auth.token);
    } catch (error) {
      this.loggingService.warn('Auth Facade: Failed to save auth to storage', {
        component: 'AuthFacade',
        action: 'saveAuthToStorage',
data: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
    }
  }

  private getAuthFromStorage(): AuthEntity | null {
    try {
      const authDataStr = localStorage.getItem(this.STORAGE_KEY);
      if (!authDataStr) return null;

      const authData = JSON.parse(authDataStr);

      // Reconstruct AuthEntity from stored data
      const userEntity = new UserEntity(
        authData.user.id,
        authData.user.name,
        authData.user.email,
        authData.user.isEmailVerified,
        new Date(authData.user.createdAt),
        new Date(authData.user.updatedAt)
      );

      return new AuthEntity(
        userEntity,
        authData.token,
        '', // refreshToken not stored for now
        new Date(authData.expiresAt)
      );
    } catch (error) {
      this.loggingService.warn('Auth Facade: Failed to retrieve auth from storage', {
        component: 'AuthFacade',
        action: 'getAuthFromStorage',
data: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
      this.clearAuthFromStorage();
      return null;
    }
  }

  private clearAuthFromStorage(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.TOKEN_KEY);
    } catch (error) {
      this.loggingService.warn('Auth Facade: Failed to clear auth from storage', {
        component: 'AuthFacade',
        action: 'clearAuthFromStorage',
data: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
    }
  }

  private isTokenValid(token: string): boolean {
    // Simple token validation - check if it exists and is not empty
    // In a real application, you might want to check token expiration
    return !!(token && token.trim().length > 0);
  }
}