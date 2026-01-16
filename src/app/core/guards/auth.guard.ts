import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, map, take } from 'rxjs';
import { AuthFacade } from '../../features/auth/auth.facade';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private authFacade: AuthFacade,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    return this.authFacade.isAuthenticated$.pipe(
      take(1),
      map(isAuthenticated => {
        if (!isAuthenticated) {
          // Store the intended URL for redirecting after login
          sessionStorage.setItem('redirectUrl', state.url);
          this.router.navigate(['/login']);
          return false;
        }
        return true;
      })
    );
  }
}