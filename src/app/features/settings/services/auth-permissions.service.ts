import { Injectable, inject } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ApiService, RequestOptions } from '../../../core/api/api.service';

export interface Permission {
  id: number;
  name: string;
  display_name: string;
  module: string;
  action: string;
  scope: string;
}

export interface Role {
  id: number;
  name: string;
  display_name: string;
  description: string;
  is_predefined: boolean;
  is_active: boolean;
  permissions?: Permission[];
}

export interface User {
  id: number;
  name: string;
  email: string;
  roles: Role[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data: T;
  errors?: any;
  meta?: {
    pagination?: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
    [key: string]: any;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthPermissionsService {
  private apiService = inject(ApiService);

  private rolesSubject = new BehaviorSubject<Role[]>([]);
  private permissionsSubject = new BehaviorSubject<Permission[]>([]);

  public roles$ = this.rolesSubject.asObservable();
  public permissions$ = this.permissionsSubject.asObservable();

  // === GESTION DES RÔLES ===

  // Charger tous les rôles
  loadRoles(includePermissions = false): Observable<Role[]> {
    const options: RequestOptions | undefined = includePermissions ? { params: { include_permissions: 'true' } } : undefined;
    return this.apiService.get<ApiResponse<{ roles: Role[] }>>('/roles', options).pipe(
      tap(response => console.log('Response structure:', response)),
      map(response => {
        // Debug: vérifier la structure de la réponse
        console.log('Full response:', response);
        console.log('Response data:', response.data);

        // Gérer différentes structures possibles de réponse
        let roles: Role[] = [];
        if (response.data && response.data.roles) {
          roles = response.data.roles;
        } else if (response.data && Array.isArray(response.data)) {
          roles = response.data;
        } else if (Array.isArray(response)) {
          roles = response as Role[];
        }

        console.log('Extracted roles:', roles);
        return roles;
      }),
      tap(roles => this.rolesSubject.next(roles))
    );
  }

  // Créer un rôle personnalisé
  createRole(roleData: {
    name: string;
    display_name: string;
    description?: string;
    permissions?: number[]
  }): Observable<Role> {
    return this.apiService.post<ApiResponse<{ role: Role }>>('/roles', roleData).pipe(
      map(response => response.data.role),
      tap(() => this.loadRoles()) // Recharger la liste
    );
  }

  // Obtenir les détails d'un rôle
  getRole(roleId: number): Observable<Role> {
    return this.apiService.get<ApiResponse<{ role: Role }>>(`/roles/${roleId}`).pipe(
      map(response => response.data.role)
    );
  }

  // Modifier un rôle
  updateRole(roleId: number, roleData: any): Observable<Role> {
    return this.apiService.put<ApiResponse<{ role: Role }>>(`/roles/${roleId}`, roleData).pipe(
      map(response => response.data.role),
      tap(() => this.loadRoles()) // Recharger la liste
    );
  }

  // Supprimer un rôle
  deleteRole(roleId: number): Observable<any> {
    return this.apiService.delete<ApiResponse<any>>(`/roles/${roleId}`).pipe(
      tap(() => this.loadRoles()) // Recharger la liste
    );
  }

  // Gérer les permissions d'un rôle
  getRolePermissions(roleId: number): Observable<Permission[]> {
    return this.apiService.get<ApiResponse<{ permissions: Permission[] }>>(`/roles/${roleId}/permissions`).pipe(
      map(response => response.data.permissions)
    );
  }

  assignPermissionToRole(roleId: number, permissionId: number): Observable<any> {
    return this.apiService.post<ApiResponse<any>>(`/roles/${roleId}/permissions`, {
      permission_id: permissionId
    });
  }

  removePermissionFromRole(roleId: number, permissionId: number): Observable<any> {
    return this.apiService.delete<ApiResponse<any>>(`/roles/${roleId}/permissions/${permissionId}`);
  }

  // === GESTION DES PERMISSIONS ===

  // Lister toutes les permissions
  loadPermissions(params?: {
    module?: string;
    action?: string;
    scope?: string;
    grouped?: boolean;
  }): Observable<Permission[]> {
    const queryParams: { [key: string]: string } = {};
    if (params?.module) queryParams['module'] = params.module;
    if (params?.action) queryParams['action'] = params.action;
    if (params?.scope) queryParams['scope'] = params.scope;
    if (params?.grouped) queryParams['grouped'] = params.grouped.toString();

    const options: RequestOptions | undefined = Object.keys(queryParams).length > 0 ? { params: queryParams } : undefined;
    return this.apiService.get<ApiResponse<{ permissions: Permission[] | any }>>('/permissions', options).pipe(
      map(response => {
        const permissions = params?.grouped ?
          Object.values(response.data.permissions).flat() as Permission[] :
          response.data.permissions;
        this.permissionsSubject.next(permissions);
        return permissions;
      })
    );
  }

  // Obtenir les modules du système
  getPermissionModules(): Observable<string[]> {
    return this.apiService.get<ApiResponse<{ modules: string[] }>>('/permissions/modules').pipe(
      map(response => response.data.modules)
    );
  }

  // Vérifier une permission
  checkPermission(
    action: string,
    resource: string,
    scope: string = 'global',
    resourceId?: number
  ): Observable<boolean> {
    return this.apiService.post<ApiResponse<{ allowed: boolean }>>('/permissions/check', {
      action,
      resource,
      scope,
      resource_id: resourceId
    }).pipe(
      map(response => response.data.allowed)
    );
  }

  // Vérification en lot
  checkPermissions(permissions: {
    action: string;
    resource: string;
    scope?: string;
    resource_id?: number;
  }[]): Observable<any[]> {
    return this.apiService.post<ApiResponse<{ results: any[] }>>('/permissions/bulk-check', {
      permissions
    }).pipe(
      map(response => response.data.results)
    );
  }

  // Mes permissions
  getUserPermissions(grouped = true): Observable<Permission[]> {
    const options: RequestOptions | undefined = grouped ? { params: { grouped: 'true' } } : undefined;
    return this.apiService.get<ApiResponse<{ permissions: Permission[] | any }>>('/users/me/permissions', options).pipe(
      map(response => {
        const permissions = grouped ?
          Object.values(response.data.permissions).flat() as Permission[] :
          response.data.permissions;
        return permissions;
      })
    );
  }

  // === ATTRIBUTION DE RÔLES AUX UTILISATEURS ===

  // Rôles d'un utilisateur
  getUserRoles(userId: number): Observable<Role[]> {
    return this.apiService.get<ApiResponse<{ roles: Role[] }>>(`/users/${userId}/roles`).pipe(
      map(response => response.data.roles)
    );
  }

  // Assigner un rôle
  assignUserRole(
    userId: number,
    roleId: number,
    effectiveFrom?: string,
    effectiveUntil?: string
  ): Observable<any> {
    return this.apiService.post<ApiResponse<any>>(`/users/${userId}/roles`, {
      role_id: roleId,
      effective_from: effectiveFrom,
      effective_until: effectiveUntil
    });
  }

  // Assigner plusieurs rôles
  assignUserRolesBulk(userId: number, roleData: any[]): Observable<any> {
    return this.apiService.post<ApiResponse<any>>(`/users/${userId}/roles/bulk-assign`, {
      roles: roleData
    });
  }

  // Modifier une assignation
  updateUserRole(
    userId: number,
    roleId: number,
    roleData: any
  ): Observable<any> {
    return this.apiService.put<ApiResponse<any>>(`/users/${userId}/roles/${roleId}`, roleData);
  }

  // Retirer un rôle
  removeUserRole(userId: number, roleId: number): Observable<any> {
    return this.apiService.delete<ApiResponse<any>>(`/users/${userId}/roles/${roleId}`);
  }

  // === GESTION DES UTILISATEURS ===

  // Récupérer tous les utilisateurs avec leurs rôles
  getUsers(): Observable<User[]> {
    return this.apiService.get<ApiResponse<{ users: User[] }>>('/users').pipe(
      map(response => response.data.users)
    );
  }

  // Récupérer un utilisateur spécifique
  getUser(userId: number): Observable<User> {
    return this.apiService.get<ApiResponse<{ user: User }>>(`/users/${userId}`).pipe(
      map(response => response.data.user)
    );
  }

  // === UTILITAIRES ===

  // Vérifier si l'utilisateur a un rôle spécifique
  hasRole(roleName: string): boolean {
    const roles = this.rolesSubject.value;
    return roles.some(role => role.name === roleName);
  }

  // Vérifier si l'utilisateur a au moins un des rôles
  hasAnyRole(roleNames: string[]): boolean {
    const roles = this.rolesSubject.value;
    return roles.some(role => roleNames.includes(role.name));
  }

  // Vérifier une permission côté client (cache)
  hasPermission(permissionName: string): boolean {
    const permissions = this.permissionsSubject.value;
    return permissions.some(p => p.name === permissionName);
  }

  // Obtenir les permissions par module
  getPermissionsByModule(moduleName: string): Permission[] {
    const permissions = this.permissionsSubject.value;
    return permissions.filter(p => p.module === moduleName);
  }
}