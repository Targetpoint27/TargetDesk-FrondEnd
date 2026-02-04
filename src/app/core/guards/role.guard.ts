import { Injectable } from '@angular/core';
import { CanActivate, CanActivateChild, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable, map, take, combineLatest, switchMap, of, catchError } from 'rxjs';
import { AuthFacade } from '../../features/auth/auth.facade';
import { PermissionService } from '../auth/permission.service';
import { LoggingService } from '../logging/logging.service';
import { Permission, UserPermissions } from '../../domain/models/permission.models';

interface RoutePermissionData {
  permissions?: Permission[];
  requireAllPermissions?: boolean; // If true, user must have ALL permissions. If false, user must have ANY permission
  redirectTo?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate, CanActivateChild {

  constructor(
    private authFacade: AuthFacade,
    private permissionService: PermissionService,
    private router: Router,
    private loggingService: LoggingService
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    return this.checkPermissions(route, state);
  }

  canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    return this.checkPermissions(route, state);
  }

  private checkPermissions(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    const routeData: RoutePermissionData = route.data as RoutePermissionData;
    const requiredPermissions = routeData.permissions;
    const requireAllPermissions = routeData.requireAllPermissions ?? false;
    const redirectTo = routeData.redirectTo ?? '/dashboard';

    this.loggingService.debug('Checking route permissions', {
      component: 'RoleGuard',
      action: 'checkPermissions',
      data: {
        route: state.url,
        requiredPermissions,
        requireAllPermissions,
        redirectTo
      }
    });

    // If no permissions are required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return this.checkAuthentication(redirectTo);
    }

    return this.authFacade.isAuthenticated$.pipe(
      take(1),
      switchMap(isAuthenticated => {
        // Check if user is authenticated
        if (!isAuthenticated) {
          this.loggingService.warn('Access denied: User not authenticated', {
            component: 'RoleGuard',
            action: 'checkPermissions',
            data: { route: state.url }
          });
          this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
          return of(false);
        }

        // Get current user to load permissions if needed
        const currentUser = this.authFacade.getCurrentUser();
        if (!currentUser) {
          this.loggingService.warn('Access denied: No current user', {
            component: 'RoleGuard',
            action: 'checkPermissions',
            data: { route: state.url }
          });
          this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
          return of(false);
        }

        // Wait for permissions to be loaded or load them if needed
        return this.permissionService.getUserPermissions().pipe(
          switchMap(userPermissions => {
            // If permissions are not loaded, try to load them
            if (!userPermissions) {
              this.loggingService.debug('Loading permissions for route access check', {
                component: 'RoleGuard',
                action: 'checkPermissions',
                data: { route: state.url, userId: currentUser.id }
              });

              return this.permissionService.loadUserPermissions(currentUser.id).pipe(
                map(loadedPermissions => ({ userPermissions: loadedPermissions, wasLoaded: true })),
                catchError(error => {
                  this.loggingService.error('Failed to load permissions for route access', {
                    component: 'RoleGuard',
                    action: 'checkPermissions',
                    data: {
                      route: state.url,
                      userId: currentUser.id,
                      error: error.message
                    }
                  });
                  return of({ userPermissions: null, wasLoaded: false });
                })
              );
            }

            return of({ userPermissions, wasLoaded: false });
          }),
          map(({ userPermissions, wasLoaded }) => {
            // Check if user permissions are still not available
            if (!userPermissions) {
              this.loggingService.warn('Access denied: Failed to load user permissions', {
                component: 'RoleGuard',
                action: 'checkPermissions',
                data: { route: state.url, wasLoaded }
              });
              this.router.navigate([redirectTo]);
              return false;
            }

            // Check permissions
            const hasRequiredPermissions = this.checkUserPermissions(
              userPermissions.permissions,
              userPermissions.roles.flatMap((role: any) => role.permissions),
              requiredPermissions,
              requireAllPermissions
            );

            if (!hasRequiredPermissions) {
              this.loggingService.warn('Access denied: Insufficient permissions', {
                component: 'RoleGuard',
                action: 'checkPermissions',
                data: {
                  route: state.url,
                  userPermissions: userPermissions.permissions,
                  requiredPermissions,
                  requireAllPermissions
                }
              });

              this.router.navigate(['/unauthorized']);
              return false;
            }

            this.loggingService.debug('Access granted', {
              component: 'RoleGuard',
              action: 'checkPermissions',
              data: { route: state.url, wasLoaded }
            });

            return true;
          }),
          take(1)
        );
      })
    );
  }

  private checkAuthentication(redirectTo: string): Observable<boolean> {
    return this.authFacade.isAuthenticated$.pipe(
      take(1),
      map(isAuthenticated => {
        if (!isAuthenticated) {
          this.router.navigate(['/login']);
          return false;
        }
        return true;
      })
    );
  }

  private checkUserPermissions(
    directPermissions: string[],
    rolePermissions: string[],
    requiredPermissions: Permission[],
    requireAllPermissions: boolean
  ): boolean {
    const allUserPermissions = [...directPermissions, ...rolePermissions];

    if (requireAllPermissions) {
      // User must have ALL required permissions
      return requiredPermissions.every(permission =>
        allUserPermissions.includes(permission)
      );
    } else {
      // User must have ANY of the required permissions
      return requiredPermissions.some(permission =>
        allUserPermissions.includes(permission)
      );
    }
  }
}