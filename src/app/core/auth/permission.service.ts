import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, map, catchError, of, tap } from 'rxjs';
import { ApiService } from '../api/api.service';
import { LoggingService } from '../logging/logging.service';
import { RoleEntity } from '../../domain/entities/role.entity';
import {
  UserPermissions,
  GetUserPermissionsResponse,
  PermissionCheckRequest,
  PermissionCheckResponse,
  BulkPermissionCheckRequest,
  BulkPermissionCheckResponse,
  Permission,
  PermissionScope,
  PermissionUtils,
  PERMISSIONS
} from '../../domain/models/permission.models';

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private userPermissions$ = new BehaviorSubject<UserPermissions | null>(null);
  private permissionsCache = new Map<string, boolean>();
  private cacheExpiration = new Map<string, number>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    private apiService: ApiService,
    private loggingService: LoggingService
  ) {}

  // Load user permissions from backend
  loadUserPermissions(userId: string): Observable<UserPermissions> {
    this.loggingService.info('Loading user permissions', {
      component: 'PermissionService',
      action: 'loadUserPermissions',
      userId
    });

    return this.apiService.get<GetUserPermissionsResponse>(`/permissions/user/${userId}`).pipe(
      map(response => {
        const roles = response.data.roles.map(role => RoleEntity.create({
          id: role.name,
          name: role.name,
          description: role.display_name || role.name,
          permissions: [],
          createdAt: new Date(),
          updatedAt: new Date()
        }));

        const userPermissions: UserPermissions = {
          userId,
          roles,
          permissions: response.data.permissions.map((permission: any) => permission.name || permission),
          lastUpdated: new Date()
        };

        this.userPermissions$.next(userPermissions);
        this.clearCache(); // Clear cache when new permissions are loaded

        this.loggingService.info('User permissions loaded successfully', {
          component: 'PermissionService',
          action: 'loadUserPermissions',
          userId,
          data: {
            rolesCount: roles.length,
            permissionsCount: userPermissions.permissions.length
          }
        });

        return userPermissions;
      }),
      catchError(error => {
        this.loggingService.error('Failed to load user permissions', {
          component: 'PermissionService',
          action: 'loadUserPermissions',
          userId,
          data: { error: error.message }
        });
        throw error;
      })
    );
  }

  // Get current user permissions as observable
  getUserPermissions(): Observable<UserPermissions | null> {
    return this.userPermissions$.asObservable();
  }

  // Get current user permissions value
  getCurrentPermissions(): UserPermissions | null {
    return this.userPermissions$.value;
  }

  // Check if user has a specific permission
  hasPermission(permission: Permission): Observable<boolean> {
    const currentPermissions = this.getCurrentPermissions();

    if (!currentPermissions) {
      return of(false);
    }

    // Check local cache first
    if (this.isPermissionCached(permission)) {
      return of(this.getCachedPermission(permission));
    }

    // Check locally first for better performance
    const hasLocal = this.hasPermissionLocal(permission);
    this.setCachedPermission(permission, hasLocal);

    this.loggingService.debug('Permission checked', {
      component: 'PermissionService',
      action: 'hasPermission',
      data: { permission, hasPermission: hasLocal }
    });

    return of(hasLocal);
  }

  // Check multiple permissions at once
  hasPermissions(permissions: Permission[]): Observable<Record<string, boolean>> {
    const currentPermissions = this.getCurrentPermissions();

    if (!currentPermissions) {
      const result: Record<string, boolean> = {};
      permissions.forEach(permission => result[permission] = false);
      return of(result);
    }

    const result: Record<string, boolean> = {};
    permissions.forEach(permission => {
      result[permission] = this.hasPermissionLocal(permission);
    });

    return of(result);
  }

  // Check if user has any of the provided permissions
  hasAnyPermission(permissions: Permission[]): Observable<boolean> {
    return this.hasPermissions(permissions).pipe(
      map(result => Object.values(result).some(hasPermission => hasPermission))
    );
  }

  // Check if user has all of the provided permissions
  hasAllPermissions(permissions: Permission[]): Observable<boolean> {
    return this.hasPermissions(permissions).pipe(
      map(result => Object.values(result).every(hasPermission => hasPermission))
    );
  }


  // Clear permissions (on logout)
  clearPermissions(): void {
    this.userPermissions$.next(null);
    this.clearCache();

    this.loggingService.info('User permissions cleared', {
      component: 'PermissionService',
      action: 'clearPermissions'
    });
  }

  // Refresh permissions from backend
  refreshPermissions(): Observable<UserPermissions | null> {
    const currentPermissions = this.getCurrentPermissions();

    if (!currentPermissions) {
      return of(null);
    }

    return this.loadUserPermissions(currentPermissions.userId);
  }

  // Private helper methods

  private hasPermissionLocal(permission: Permission): boolean {
    const currentPermissions = this.getCurrentPermissions();

    if (!currentPermissions) {
      return false;
    }

    // Check direct permissions
    if (currentPermissions.permissions.includes(permission)) {
      return true;
    }

    // Check role permissions
    return currentPermissions.roles.some(role => role.hasPermission(permission));
  }

  private isPermissionCached(permission: string): boolean {
    if (!this.permissionsCache.has(permission)) {
      return false;
    }

    const expiration = this.cacheExpiration.get(permission);
    if (!expiration || Date.now() > expiration) {
      this.permissionsCache.delete(permission);
      this.cacheExpiration.delete(permission);
      return false;
    }

    return true;
  }

  private getCachedPermission(permission: string): boolean {
    return this.permissionsCache.get(permission) || false;
  }

  private setCachedPermission(permission: string, hasPermission: boolean): void {
    this.permissionsCache.set(permission, hasPermission);
    this.cacheExpiration.set(permission, Date.now() + this.CACHE_TTL);
  }

  private clearCache(): void {
    this.permissionsCache.clear();
    this.cacheExpiration.clear();
  }

  // Enhanced permission checking with scopes (following backend guide)

  // Check if user can access a module with any scope (global, team, own)
  canAccess(module: string, action: string, scope: PermissionScope = 'global'): Observable<boolean> {
    const permission = PermissionUtils.buildPermission(module, action, scope) as Permission;
    return this.hasPermission(permission);
  }

  // Check with fallback scopes - tries global first, then team, then own
  canAccessWithFallback(module: string, action: string): Observable<boolean> {
    const permissionVariations = PermissionUtils.getPermissionVariations(module, action);
    return this.hasAnyPermission(permissionVariations as Permission[]);
  }

  // Check specific permission for a resource with context
  hasResourcePermission(permission: Permission, resourceOwnerId?: string): Observable<boolean> {
    const currentPermissions = this.getCurrentPermissions();

    if (!currentPermissions) {
      return of(false);
    }

    // Check if user has global permission
    if (currentPermissions.permissions.includes(permission)) {
      return of(true);
    }

    // If permission has scope, check resource ownership
    const parsed = PermissionUtils.parsePermission(permission);
    if (parsed.scope === 'own' && resourceOwnerId) {
      // This would require user ID - implement based on your user management
      // For now, return basic permission check
      return this.hasPermission(permission);
    }

    return of(false);
  }

  // Bulk check permissions with scope fallback
  checkPermissionsWithScope(permissions: string[]): Observable<Record<string, boolean>> {
    const currentPermissions = this.getCurrentPermissions();

    if (!currentPermissions) {
      const result: Record<string, boolean> = {};
      permissions.forEach(permission => result[permission] = false);
      return of(result);
    }

    const result: Record<string, boolean> = {};
    permissions.forEach(permission => {
      result[permission] = this.hasPermissionLocal(permission as Permission);
    });

    return of(result);
  }

  // API call to check permissions on server (for critical operations)
  checkPermissionOnServer(permission: string): Observable<boolean> {
    return this.apiService.post<PermissionCheckResponse>('/permissions/check', { permission }).pipe(
      map(response => response.data.hasPermission),
      catchError(() => of(false))
    );
  }

  // Bulk check permissions on server
  bulkCheckPermissionsOnServer(permissions: string[]): Observable<Record<string, boolean>> {
    return this.apiService.post<BulkPermissionCheckResponse>('/permissions/bulk-check', { permissions }).pipe(
      map(response => response.data.permissions),
      catchError(() => {
        const result: Record<string, boolean> = {};
        permissions.forEach(permission => result[permission] = false);
        return of(result);
      })
    );
  }

  // Utility methods for checking specific permission groups (updated with new permissions)

  canViewDashboard(): Observable<boolean> {
    return this.hasAnyPermission([
      PERMISSIONS.DASHBOARD_COMMERCIAL,
      PERMISSIONS.DASHBOARD_PERSONAL
    ]);
  }

  canViewCommercialDashboard(): Observable<boolean> {
    return this.hasPermission(PERMISSIONS.DASHBOARD_COMMERCIAL);
  }

  canManageClients(): Observable<boolean> {
    return this.canAccessWithFallback('clients', 'create').pipe(
      map(canCreate => canCreate),
      catchError(() => this.canAccessWithFallback('clients', 'update')),
      catchError(() => this.hasPermission(PERMISSIONS.CLIENTS_DELETE))
    );
  }

  canReadClients(): Observable<boolean> {
    return this.canAccessWithFallback('clients', 'read');
  }

  canExportClients(): Observable<boolean> {
    return this.canAccessWithFallback('clients', 'export');
  }

  canManageContacts(): Observable<boolean> {
    return this.canAccessWithFallback('contacts', 'create').pipe(
      map(canCreate => canCreate),
      catchError(() => this.canAccessWithFallback('contacts', 'update')),
      catchError(() => this.hasPermission(PERMISSIONS.CONTACTS_DELETE))
    );
  }

  canManageDocuments(): Observable<boolean> {
    return this.canAccessWithFallback('documents', 'create').pipe(
      map(canCreate => canCreate),
      catchError(() => this.canAccessWithFallback('documents', 'update')),
      catchError(() => this.hasPermission(PERMISSIONS.DOCUMENTS_DELETE))
    );
  }

  canManageUsers(): Observable<boolean> {
    return this.hasAnyPermission([
      PERMISSIONS.USERS_CREATE,
      PERMISSIONS.USERS_UPDATE,
      PERMISSIONS.USERS_DELETE
    ]);
  }

  canManageRoles(): Observable<boolean> {
    return this.hasAnyPermission([
      PERMISSIONS.ROLES_CREATE,
      PERMISSIONS.ROLES_READ,
      PERMISSIONS.ROLES_UPDATE,
      PERMISSIONS.ROLES_DELETE,
      PERMISSIONS.ROLES_ASSIGN
    ]);
  }

  canAccessSystem(): Observable<boolean> {
    return this.hasAnyPermission([
      PERMISSIONS.SYSTEM_VIEW,
      PERMISSIONS.SYSTEM_MANAGE
    ]);
  }

  canManageSystem(): Observable<boolean> {
    return this.hasPermission(PERMISSIONS.SYSTEM_MANAGE);
  }

  canGenerateReports(): Observable<boolean> {
    return this.hasPermission(PERMISSIONS.REPORTS_GENERATE);
  }

  canViewReports(): Observable<boolean> {
    return this.hasAnyPermission([
      PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.REPORTS_VIEW_OWN
    ]);
  }

  canUseTeamFeatures(): Observable<boolean> {
    return this.hasPermission(PERMISSIONS.TEAM_VIEW_ENABLE);
  }

  canViewTeamLogs(): Observable<boolean> {
    return this.hasPermission(PERMISSIONS.TEAM_VIEW_LOGS);
  }
}