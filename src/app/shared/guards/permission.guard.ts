import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthPermissionsService } from '../../features/settings/services/auth-permissions.service';

@Injectable({
  providedIn: 'root'
})
export class PermissionGuard implements CanActivate {

  constructor(
    private authPermissions: AuthPermissionsService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {

    const requiredPermission = route.data['permission'];
    const requiredRoles = route.data['roles'];

    // Vérification des rôles
    if (requiredRoles) {
      if (Array.isArray(requiredRoles)) {
        if (!this.authPermissions.hasAnyRole(requiredRoles)) {
          this.router.navigate(['/unauthorized'], {
            queryParams: { returnUrl: state.url }
          });
          return of(false);
        }
      } else {
        if (!this.authPermissions.hasRole(requiredRoles)) {
          this.router.navigate(['/unauthorized'], {
            queryParams: { returnUrl: state.url }
          });
          return of(false);
        }
      }
    }

    // Vérification des permissions
    if (requiredPermission) {
      const { action, resource, scope = 'global' } = requiredPermission;

      return this.authPermissions.checkPermission(action, resource, scope).pipe(
        map(hasPermission => {
          if (!hasPermission) {
            this.router.navigate(['/unauthorized'], {
              queryParams: { returnUrl: state.url }
            });
            return false;
          }
          return true;
        }),
        catchError((error) => {
          console.error('Permission check failed:', error);
          this.router.navigate(['/unauthorized'], {
            queryParams: { returnUrl: state.url }
          });
          return of(false);
        })
      );
    }

    return of(true);
  }
}