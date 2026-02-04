import { Component, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthFacade } from '../auth/auth.facade';
import { AuthPermissionsService } from './services/auth-permissions.service';
import { PermissionService } from '../../core/auth/permission.service';
import { PERMISSIONS } from '../../domain/models/permission.models';
import { Observable, map, combineLatest } from 'rxjs';

interface SettingsMenuItem {
  id: string;
  title: string;
  route: string;
  icon: string;
  description: string;
  requiredPermissions: string[];
  badge?: string;
}

@Component({
  selector: 'app-settings-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex">
      <!-- Menu latéral compact à l'extrême gauche -->
      <aside class="w-64 flex-shrink-0 bg-white/80 backdrop-blur-sm border-r border-white/60 shadow-lg">
        <div class="sticky top-0 h-screen overflow-y-auto">
          <!-- Header compact -->
          <div class="p-4 border-b border-gray-200/60">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <div class="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <i class="bi bi-gear text-white text-sm"></i>
                </div>
                <div>
                  <h1 class="text-lg font-bold text-slate-800">Paramètres</h1>
                  <p class="text-xs text-slate-600">Configuration</p>
                </div>
              </div>
              <button (click)="navigateToDashboard()"
                      class="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                      title="Retour au Dashboard">
                <i class="bi bi-arrow-left text-sm"></i>
              </button>
            </div>
          </div>

          <div class="p-3">
            <!-- Menu Administration (Admin/Super Admin) -->
            <div *ngIf="hasAdminAccess$ | async" class="mb-6">
              <div class="flex items-center px-2 py-1 mb-3 relative">
                <div class="w-5 h-5 bg-gradient-to-br from-red-500 to-pink-600 rounded flex items-center justify-center">
                  <i class="bi bi-shield-exclamation text-white text-xs"></i>
                </div>
                <h3 class="text-xs font-semibold text-slate-700 uppercase tracking-wide absolute left-10 top-1/2 transform -translate-y-1/2">Administration</h3>
              </div>
              <nav class="space-y-1">
                <ng-container *ngFor="let item of visibleAdminItems$ | async">
                  <a [routerLink]="item.route"
                     routerLinkActive="bg-blue-50 border-blue-200 text-blue-700 shadow-sm"
                     [routerLinkActiveOptions]="{ exact: false }"
                     class="group flex items-center p-2 text-gray-700 rounded-lg border border-transparent hover:bg-gray-50 hover:border-gray-200 transition-all duration-200">

                    <div class="flex items-center justify-center w-6 h-6 rounded bg-gray-100 group-hover:bg-blue-100 mr-2 transition-colors">
                      <i [class]="'bi bi-' + item.icon + ' text-gray-600 group-hover:text-blue-600 text-xs'"></i>
                    </div>

                    <div class="flex-1 min-w-0">
                      <div class="flex items-center justify-between">
                        <span class="text-sm font-medium">{{ item.title }}</span>
                        <span *ngIf="item.badge" class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                          {{ item.badge }}
                        </span>
                      </div>
                    </div>

                    <i class="bi bi-chevron-right text-gray-400 text-xs"></i>
                  </a>
                </ng-container>
              </nav>
            </div>


            <!-- Menu Personnel (Tous) -->
            <div class="mb-6">
              <div class="flex items-center px-2 py-1 mb-3 relative">
                <div class="w-5 h-5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded flex items-center justify-center">
                  <i class="bi bi-person-circle text-white text-xs"></i>
                </div>
                <h3 class="text-xs font-semibold text-slate-700 uppercase tracking-wide absolute left-10 top-1/2 transform -translate-y-1/2">Mon compte</h3>
              </div>
              <nav class="space-y-1">
                <ng-container *ngFor="let item of personalMenuItems">
                  <a [routerLink]="item.route"
                     routerLinkActive="bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm"
                     [routerLinkActiveOptions]="{ exact: false }"
                     class="group flex items-center p-2 text-gray-700 rounded-lg border border-transparent hover:bg-gray-50 hover:border-gray-200 transition-all duration-200">

                    <div class="flex items-center justify-center w-6 h-6 rounded bg-gray-100 group-hover:bg-emerald-100 mr-2 transition-colors">
                      <i [class]="'bi bi-' + item.icon + ' text-gray-600 group-hover:text-emerald-600 text-xs'"></i>
                    </div>

                    <div class="flex-1 min-w-0">
                      <div class="flex items-center justify-between">
                        <span class="text-sm font-medium">{{ item.title }}</span>
                        <span *ngIf="item.badge" class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                          {{ item.badge }}
                        </span>
                      </div>
                    </div>

                    <i class="bi bi-chevron-right text-gray-400 text-xs"></i>
                  </a>
                </ng-container>
              </nav>
            </div>

            <!-- Message consultation (Consultant) -->
            <div *ngIf="isConsultantUser()">
              <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/60 rounded-lg p-3">
                <div class="flex items-start space-x-2">
                  <div class="w-5 h-5 bg-blue-100 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                    <i class="bi bi-info-circle text-blue-600 text-xs"></i>
                  </div>
                  <div>
                    <h4 class="text-xs font-medium text-blue-900">Accès lecture seule</h4>
                    <p class="text-xs text-blue-700 mt-1">Consultation uniquement.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <!-- Contenu principal -->
      <main class="flex-1 min-w-0">
        <div class="h-screen overflow-y-auto">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `
})
export class SettingsLayoutComponent implements OnInit {
  private authFacade = inject(AuthFacade);
  private authPermissions = inject(AuthPermissionsService);
  private permissionService = inject(PermissionService);
  private router = inject(Router);

  visibleAdminItems$!: Observable<SettingsMenuItem[]>;
  hasAdminAccess$!: Observable<boolean>;

  adminMenuItems: SettingsMenuItem[] = [
    {
      id: 'user-management',
      title: 'Gestion des utilisateurs',
      route: '/settings/user-management',
      icon: 'people',
      description: 'Créer, modifier et gérer les utilisateurs',
      badge: 'Admin',
      requiredPermissions: [PERMISSIONS.USERS_READ]
    },
    {
      id: 'roles-management',
      title: 'Gestion des rôles',
      route: '/settings/roles-management',
      icon: 'shield-check',
      description: 'Créer, modifier et assigner des rôles',
      requiredPermissions: [PERMISSIONS.ROLES_READ]
    },
    {
      id: 'permissions-management',
      title: 'Gestion des permissions',
      route: '/settings/permissions-management',
      icon: 'key',
      description: 'Consulter et gérer les permissions par module',
      requiredPermissions: [PERMISSIONS.PERMISSIONS_READ]
    },
    {
      id: 'users-roles',
      title: 'Attribution des rôles',
      route: '/settings/users-roles',
      icon: 'person-badge',
      description: 'Assigner des rôles aux utilisateurs',
      requiredPermissions: [PERMISSIONS.ROLES_ASSIGN]
    }
  ];

  personalMenuItems: SettingsMenuItem[] = [
    {
      id: 'my-permissions',
      title: 'Mes permissions',
      route: '/settings/my-permissions',
      icon: 'key',
      description: 'Détail de mes permissions par module',
      requiredPermissions: [] // Accessible à tous
    }
  ];

  ngOnInit(): void {
    // Configure les observables pour l'affichage conditionnel
    this.visibleAdminItems$ = this.permissionService.getUserPermissions().pipe(
      map(userPermissions => {
        if (!userPermissions) return [];

        // Filtrer les éléments admin selon les permissions
        return this.adminMenuItems.filter(item => {
          if (item.requiredPermissions.length === 0) return true;

          return item.requiredPermissions.some(permission =>
            userPermissions.permissions.includes(permission)
          );
        });
      })
    );

    this.hasAdminAccess$ = this.visibleAdminItems$.pipe(
      map(items => items.length > 0)
    );
  }

  hasAdminMenus(): boolean {
    // Utiliser l'observable
    let hasAccess = false;
    this.hasAdminAccess$.subscribe(access => hasAccess = access).unsubscribe();
    return hasAccess;
  }

  isConsultantUser(): boolean {
    // Pour l'instant, toujours false - peut être ajouté plus tard
    return false;
  }

  navigateToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}