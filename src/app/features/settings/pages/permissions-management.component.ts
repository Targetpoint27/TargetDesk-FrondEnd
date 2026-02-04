import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { AuthPermissionsService, Permission } from '../services/auth-permissions.service';

interface PermissionGroup {
  module: string;
  permissions: Permission[];
  expanded: boolean;
}

@Component({
  selector: 'app-permissions-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="p-8">
      <!-- En-tête -->
      <div class="mb-8">
        <h2 class="text-2xl font-bold text-slate-800 mb-2">Gestion des permissions</h2>
        <p class="text-slate-600">Consulter et gérer les permissions du système par module</p>
      </div>

      <!-- Filtres et actions -->
      <div class="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div class="flex flex-wrap items-center gap-4">
          <div class="flex items-center space-x-4">
            <label class="text-sm font-medium text-slate-700">Filtrer par :</label>

            <div class="relative">
              <select [formControl]="moduleFilter"
                      class="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-gray-700 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 cursor-pointer">
                <option value="">Tous les modules</option>
                <option *ngFor="let module of modules" [value]="module">{{ module }}</option>
              </select>
              <div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <i class="bi bi-chevron-down text-gray-400 text-xs"></i>
              </div>
            </div>

            <div class="relative">
              <select [formControl]="actionFilter"
                      class="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-gray-700 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 cursor-pointer">
                <option value="">Toutes les actions</option>
                <option *ngFor="let action of actions" [value]="action">{{ action }}</option>
              </select>
              <div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <i class="bi bi-chevron-down text-gray-400 text-xs"></i>
              </div>
            </div>

            <div class="relative">
              <select [formControl]="scopeFilter"
                      class="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-gray-700 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 cursor-pointer">
                <option value="">Tous les scopes</option>
                <option *ngFor="let scope of scopes" [value]="scope">{{ scope }}</option>
              </select>
              <div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <i class="bi bi-chevron-down text-gray-400 text-xs"></i>
              </div>
            </div>
          </div>

          <div class="flex items-center space-x-2 ml-auto">
            <button (click)="expandAll()"
                    class="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm transition-colors">
              <i class="bi bi-arrows-expand mr-1"></i>
              Tout développer
            </button>
            <button (click)="collapseAll()"
                    class="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm transition-colors">
              <i class="bi bi-arrows-collapse mr-1"></i>
              Tout réduire
            </button>
            <button (click)="loadPermissions()"
                    class="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-sm transition-colors">
              <i class="bi bi-arrow-clockwise mr-1"></i>
              Actualiser
            </button>
          </div>
        </div>

        <!-- Statistiques -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200">
          <div class="text-center">
            <div class="text-2xl font-bold text-blue-600">{{ totalPermissions }}</div>
            <div class="text-sm text-slate-600">Permissions totales</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-green-600">{{ filteredGroups.length }}</div>
            <div class="text-sm text-slate-600">Modules</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-orange-600">{{ actions.length }}</div>
            <div class="text-sm text-slate-600">Actions uniques</div>
          </div>
          <div class="text-center">
            <div class="text-2xl font-bold text-purple-600">{{ scopes.length }}</div>
            <div class="text-sm text-slate-600">Scopes disponibles</div>
          </div>
        </div>
      </div>

      <!-- Liste des permissions par module -->
      <div *ngIf="loading" class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span class="ml-2 text-slate-600">Chargement des permissions...</span>
      </div>

      <div *ngIf="!loading" class="space-y-2">
        <div *ngFor="let group of filteredGroups" class="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <!-- En-tête du module -->
          <div class="p-3 bg-gradient-to-r from-slate-50 to-slate-100 cursor-pointer hover:from-slate-100 hover:to-slate-200 transition-colors"
               (click)="toggleGroup(group)">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <div class="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <i [class]="getModuleIcon(group.module)" class="text-white text-xs"></i>
                </div>
                <div>
                  <h3 class="font-semibold text-slate-800 text-base">{{ group.module }}</h3>
                  <p class="text-xs text-slate-600">{{ group.permissions.length }} permissions</p>
                </div>
              </div>
              <div class="flex items-center space-x-1">
                <span class="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {{ getModuleActions(group.module).join(', ') }}
                </span>
                <i [class]="group.expanded ? 'bi bi-chevron-up' : 'bi bi-chevron-down'"
                   class="text-slate-400 text-xs"></i>
              </div>
            </div>
          </div>

          <!-- Contenu du module -->
          <div *ngIf="group.expanded" class="p-4">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div *ngFor="let permission of group.permissions"
                   class="p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors">
                <div class="flex items-start justify-between">
                  <div class="flex-1 min-w-0">
                    <h4 class="font-medium text-slate-800 text-sm truncate">{{ permission.display_name }}</h4>
                    <p class="text-xs text-slate-600 mt-0.5 truncate">{{ permission.name }}</p>
                    <div class="flex items-center space-x-2 mt-2">
                      <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium"
                            [class.bg-green-100]="permission.action === 'read'"
                            [class.text-green-800]="permission.action === 'read'"
                            [class.bg-blue-100]="permission.action === 'create'"
                            [class.text-blue-800]="permission.action === 'create'"
                            [class.bg-orange-100]="permission.action === 'update'"
                            [class.text-orange-800]="permission.action === 'update'"
                            [class.bg-red-100]="permission.action === 'delete'"
                            [class.text-red-800]="permission.action === 'delete'"
                            [class.bg-purple-100]="!['read','create','update','delete'].includes(permission.action)"
                            [class.text-purple-800]="!['read','create','update','delete'].includes(permission.action)">
                        {{ permission.action }}
                      </span>
                      <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium"
                            [class.bg-gray-100]="permission.scope === 'global'"
                            [class.text-gray-800]="permission.scope === 'global'"
                            [class.bg-yellow-100]="permission.scope === 'team'"
                            [class.text-yellow-800]="permission.scope === 'team'"
                            [class.bg-indigo-100]="permission.scope === 'own'"
                            [class.text-indigo-800]="permission.scope === 'own'">
                        {{ permission.scope }}
                      </span>
                    </div>
                  </div>
                  <div class="text-xs text-slate-500 ml-1 flex-shrink-0">
                    #{{ permission.id }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div *ngIf="filteredGroups.length === 0" class="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <i class="bi bi-key text-4xl text-gray-400 mb-4"></i>
          <h3 class="text-lg font-medium text-slate-800 mb-2">Aucune permission trouvée</h3>
          <p class="text-slate-600">Aucune permission ne correspond aux filtres sélectionnés.</p>
        </div>
      </div>

    </div>
  `
})
export class PermissionsManagementComponent implements OnInit {
  private authPermissions = inject(AuthPermissionsService);
  private cdr = inject(ChangeDetectorRef);

  permissions: Permission[] = [];
  permissionGroups: PermissionGroup[] = [];
  filteredGroups: PermissionGroup[] = [];

  modules: string[] = [];
  actions: string[] = [];
  scopes: string[] = [];

  loading = true;

  // Filtres
  moduleFilter = new FormControl('');
  actionFilter = new FormControl('');
  scopeFilter = new FormControl('');


  get totalPermissions(): number {
    return this.filteredGroups.reduce((total, group) => total + group.permissions.length, 0);
  }

  ngOnInit(): void {
    this.loadPermissions();
    this.setupFilters();
  }

  setupFilters(): void {
    // Écouter les changements de filtres
    this.moduleFilter.valueChanges.subscribe(() => this.applyFilters());
    this.actionFilter.valueChanges.subscribe(() => this.applyFilters());
    this.scopeFilter.valueChanges.subscribe(() => this.applyFilters());
  }

  loadPermissions(): void {
    this.loading = true;
    this.cdr.detectChanges();
    this.authPermissions.loadPermissions({ grouped: false }).subscribe({
      next: (permissions) => {
        this.permissions = permissions;
        this.processPermissions();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des permissions:', error);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  processPermissions(): void {
    // Extraire les valeurs uniques
    this.modules = [...new Set(this.permissions.map(p => p.module))].sort();
    this.actions = [...new Set(this.permissions.map(p => p.action))].sort();
    this.scopes = [...new Set(this.permissions.map(p => p.scope))].sort();

    // Grouper par module
    this.permissionGroups = this.modules.map(module => ({
      module,
      permissions: this.permissions.filter(p => p.module === module),
      expanded: false
    }));

    this.applyFilters();
  }

  applyFilters(): void {
    let filtered = [...this.permissionGroups];

    // Filtrer par module
    if (this.moduleFilter.value) {
      filtered = filtered.filter(group => group.module === this.moduleFilter.value);
    }

    // Filtrer par action et scope dans chaque groupe
    filtered = filtered.map(group => ({
      ...group,
      permissions: group.permissions.filter(permission => {
        const actionMatch = !this.actionFilter.value || permission.action === this.actionFilter.value;
        const scopeMatch = !this.scopeFilter.value || permission.scope === this.scopeFilter.value;
        return actionMatch && scopeMatch;
      })
    })).filter(group => group.permissions.length > 0);

    this.filteredGroups = filtered;
  }

  toggleGroup(group: PermissionGroup): void {
    group.expanded = !group.expanded;
  }

  expandAll(): void {
    this.filteredGroups.forEach(group => group.expanded = true);
  }

  collapseAll(): void {
    this.filteredGroups.forEach(group => group.expanded = false);
  }

  getModuleIcon(module: string): string {
    const iconMap: { [key: string]: string } = {
      users: 'bi bi-people',
      roles: 'bi bi-shield',
      permissions: 'bi bi-key',
      clients: 'bi bi-briefcase',
      contacts: 'bi bi-person-lines-fill',
      documents: 'bi bi-file-text',
      dashboard: 'bi bi-speedometer2',
      reports: 'bi bi-graph-up',
      team: 'bi bi-diagram-3',
      access: 'bi bi-lock'
    };
    return iconMap[module] || 'bi bi-gear';
  }

  getModuleActions(module: string): string[] {
    const modulePermissions = this.permissions.filter(p => p.module === module);
    return [...new Set(modulePermissions.map(p => p.action))];
  }

}