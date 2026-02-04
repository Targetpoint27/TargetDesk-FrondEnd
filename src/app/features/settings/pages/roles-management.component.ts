import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule, FormControl } from '@angular/forms';
import { AuthPermissionsService, Role, Permission } from '../services/auth-permissions.service';
import { MessageService } from '../../../shared/services/message.service';

@Component({
  selector: 'app-roles-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  template: `
    <div class="p-8">
      <!-- En-tête -->
      <div class="mb-8">
        <h2 class="text-2xl font-bold text-slate-800 mb-2">Gestion des rôles</h2>
        <p class="text-slate-600">Créer, modifier et gérer les rôles du système</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Liste des rôles existants -->
        <div class="lg:col-span-2">
          <div class="bg-white rounded-xl border border-gray-200 p-6">
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-lg font-semibold text-slate-800">Rôles existants</h3>
              <div class="flex items-center space-x-2">
                <div class="relative">
                  <select [formControl]="filterControl"
                          class="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-gray-700 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 cursor-pointer">
                    <option value="all">Tous les rôles</option>
                    <option value="predefined">Prédéfinis</option>
                    <option value="custom">Personnalisés</option>
                  </select>
                  <div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                    <i class="bi bi-chevron-down text-gray-400 text-xs"></i>
                  </div>
                </div>
                <button (click)="loadRoles()"
                        class="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md text-sm transition-colors">
                  <i class="bi bi-arrow-clockwise mr-1"></i>
                  Actualiser
                </button>
              </div>
            </div>

            <div *ngIf="loading" class="flex items-center justify-center py-8">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span class="ml-2 text-slate-600">Chargement des rôles...</span>
            </div>

            <div *ngIf="!loading" class="space-y-4">
              <div *ngFor="let role of filteredRoles"
                   class="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="flex items-center space-x-3">
                      <h4 class="font-medium text-slate-800">{{ role.display_name }}</h4>
                      <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                            [class.bg-blue-100]="role.is_predefined"
                            [class.text-blue-800]="role.is_predefined"
                            [class.bg-green-100]="!role.is_predefined"
                            [class.text-green-800]="!role.is_predefined">
                        {{ role.is_predefined ? 'Prédéfini' : 'Personnalisé' }}
                      </span>
                      <span *ngIf="!role.is_active" class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                        Inactif
                      </span>
                    </div>
                    <p class="text-sm text-slate-600 mt-1">{{ role.description }}</p>
                    <div class="flex items-center space-x-4 mt-2 text-xs text-slate-500">
                      <span>ID: {{ role.id }}</span>
                      <span>Nom: {{ role.name }}</span>
                      <span *ngIf="role.permissions">{{ role.permissions.length }} permissions</span>
                    </div>
                  </div>

                  <div class="flex items-center space-x-2 ml-4">
                    <button (click)="editRole(role)"
                            class="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm transition-colors">
                      <i class="bi bi-pencil mr-1"></i>
                      Modifier
                    </button>
                    <button (click)="viewPermissions(role)"
                            class="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-sm transition-colors">
                      <i class="bi bi-key mr-1"></i>
                      Permissions
                    </button>
                    <button *ngIf="!role.is_predefined"
                            (click)="deleteRole(role)"
                            class="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm transition-colors">
                      <i class="bi bi-trash mr-1"></i>
                      Supprimer
                    </button>
                  </div>
                </div>
              </div>

              <div *ngIf="filteredRoles.length === 0" class="text-center py-8">
                <i class="bi bi-shield text-4xl text-gray-400 mb-2"></i>
                <p class="text-slate-600">Aucun rôle trouvé</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Formulaire de création/édition -->
        <div class="lg:col-span-1">
          <div class="bg-white rounded-xl border border-gray-200 p-6 sticky top-8">
            <h3 class="text-lg font-semibold text-slate-800 mb-4">
              {{ isEditing ? 'Modifier le rôle' : 'Créer un rôle' }}
            </h3>

            <form [formGroup]="roleForm" (ngSubmit)="saveRole()" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-2">Nom du rôle</label>
                <input type="text" formControlName="name"
                       placeholder="ex: regional_manager"
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900">
                <div *ngIf="roleForm.get('name')?.invalid && roleForm.get('name')?.touched"
                     class="text-red-600 text-xs mt-1">
                  Le nom est requis
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-700 mb-2">Nom d'affichage</label>
                <input type="text" formControlName="display_name"
                       placeholder="ex: Gestionnaire Régional"
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900">
                <div *ngIf="roleForm.get('display_name')?.invalid && roleForm.get('display_name')?.touched"
                     class="text-red-600 text-xs mt-1">
                  Le nom d'affichage est requis
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-700 mb-2">Description</label>
                <textarea formControlName="description" rows="3"
                          placeholder="Description du rôle et de ses responsabilités"
                          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 resize-none"></textarea>
              </div>

              <!-- Sélection des permissions -->
              <div>
                <div class="flex items-center justify-between mb-3">
                  <label class="text-sm font-medium text-slate-700">Permissions</label>
                  <div class="text-xs text-slate-500">
                    {{ selectedPermissions.size }} sélectionnée(s)
                  </div>
                </div>

                <div class="bg-gray-50/50 border border-gray-200 rounded-xl p-4 max-h-64 overflow-y-auto">
                  <div *ngIf="loadingPermissions" class="text-center py-8">
                    <div class="inline-flex items-center space-x-2 text-slate-500">
                      <div class="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <span class="text-sm">Chargement des permissions...</span>
                    </div>
                  </div>

                  <div *ngIf="!loadingPermissions" class="space-y-4">
                    <div *ngFor="let module of permissionModules" class="bg-white rounded-lg border border-gray-100 shadow-sm">
                      <div class="flex items-center justify-between p-3 bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-100 cursor-pointer hover:from-slate-100 hover:to-gray-100 transition-all duration-200"
                           [class.rounded-lg]="!isModuleExpanded(module)"
                           [class.rounded-t-lg]="isModuleExpanded(module)"
                           (click)="toggleModuleCollapse(module)">
                        <div class="flex items-center space-x-3">
                          <div class="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                            <i class="bi bi-collection text-blue-600 text-xs"></i>
                          </div>
                          <h5 class="font-medium text-slate-700 text-sm capitalize">{{ module }}</h5>
                        </div>
                        <div class="flex items-center space-x-3">
                          <div class="text-xs text-slate-500">
                            {{ getSelectedModulePermissionsCount(module) }}/{{ getModulePermissions(module).length }}
                          </div>
                          <div class="flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 transition-transform duration-200"
                               [class.rotate-180]="!isModuleExpanded(module)">
                            <i class="bi bi-chevron-up text-gray-600 text-xs"></i>
                          </div>
                        </div>
                      </div>

                      <div *ngIf="isModuleExpanded(module)" class="p-3 grid grid-cols-1 gap-2 animate-in slide-in-from-top-1 duration-200">
                        <div *ngFor="let permission of getModulePermissions(module)"
                             class="group flex items-center p-2 rounded-lg hover:bg-blue-50/50 transition-all duration-200">
                          <div class="flex items-center">
                            <input type="checkbox"
                                   [id]="'perm-' + permission.id"
                                   [checked]="selectedPermissions.has(permission.id)"
                                   (change)="onPermissionChange(permission, $event)"
                                   class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 transition-colors">
                            <label [for]="'perm-' + permission.id"
                                   class="ml-3 flex-1 cursor-pointer select-none">
                              <div class="flex items-center justify-between">
                                <span class="text-sm font-medium text-slate-700 group-hover:text-blue-700 transition-colors">
                                  {{ permission.display_name }}
                                </span>
                                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                                      [class.bg-green-100]="permission.action === 'read'"
                                      [class.text-green-700]="permission.action === 'read'"
                                      [class.bg-blue-100]="permission.action === 'create'"
                                      [class.text-blue-700]="permission.action === 'create'"
                                      [class.bg-orange-100]="permission.action === 'update'"
                                      [class.text-orange-700]="permission.action === 'update'"
                                      [class.bg-red-100]="permission.action === 'delete'"
                                      [class.text-red-700]="permission.action === 'delete'"
                                      [class.bg-purple-100]="!['read','create','update','delete'].includes(permission.action)"
                                      [class.text-purple-700]="!['read','create','update','delete'].includes(permission.action)">
                                  {{ permission.action }}
                                </span>
                              </div>
                              <div class="text-xs text-slate-500 mt-0.5">
                                {{ permission.name }} • {{ permission.scope }}
                              </div>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div *ngIf="permissionModules.length === 0" class="text-center py-8">
                      <div class="text-slate-400 mb-2">
                        <i class="bi bi-key text-2xl"></i>
                      </div>
                      <p class="text-sm text-slate-500">Aucune permission disponible</p>
                    </div>
                  </div>
                </div>
              </div>

              <div class="flex space-x-2">
                <button type="submit"
                        [disabled]="roleForm.invalid || submitting"
                        class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium rounded-lg transition-colors">
                  <i class="bi bi-check-circle mr-2"></i>
                  {{ submitting ? 'Enregistrement...' : (isEditing ? 'Modifier' : 'Créer') }}
                </button>
                <button *ngIf="isEditing"
                        type="button"
                        (click)="cancelEdit()"
                        class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors">
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `
})
export class RolesManagementComponent implements OnInit {
  private authPermissions = inject(AuthPermissionsService);
  private fb = inject(FormBuilder);
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);

  roles: Role[] = [];
  filteredRoles: Role[] = [];
  permissions: Permission[] = [];
  permissionModules: string[] = [];
  selectedPermissions = new Set<number>();
  moduleCollapseState: { [module: string]: boolean } = {};

  filterControl = new FormControl('all');
  loading = true;
  loadingPermissions = true;
  submitting = false;
  isEditing = false;
  editingRoleId: number | null = null;

  roleForm: FormGroup;

  constructor() {
    this.roleForm = this.fb.group({
      name: ['', [Validators.required, Validators.pattern(/^[a-z][a-z_]*$/)]],
      display_name: ['', Validators.required],
      description: ['']
    });
  }

  ngOnInit(): void {
    this.loadRoles();
    this.loadPermissions();

    // Écouter les changements du filtre
    this.filterControl.valueChanges.subscribe(() => {
      this.filterRoles();
    });
  }

  loadRoles(): void {
    this.loading = true;
    this.cdr.detectChanges(); // Force change detection
    console.log('Starting to load roles...');

    this.authPermissions.loadRoles(true).subscribe({
      next: (roles) => {
        console.log('Roles received in component:', roles);
        this.roles = roles;
        this.filterRoles();
        this.loading = false;
        this.cdr.detectChanges(); // Force change detection
        console.log('Loading set to false and change detection triggered');
      },
      error: (error) => {
        console.error('Erreur lors du chargement des rôles:', error);
        this.messageService.showError('Erreur lors du chargement des rôles');
        this.loading = false;
        this.cdr.detectChanges(); // Force change detection
        console.log('Loading set to false due to error and change detection triggered');
      },
      complete: () => {
        console.log('loadRoles observable completed');
      }
    });
  }

  loadPermissions(): void {
    this.loadingPermissions = true;
    this.cdr.detectChanges();
    this.authPermissions.loadPermissions({ grouped: true }).subscribe({
      next: (permissions) => {
        this.permissions = permissions;
        this.permissionModules = [...new Set(permissions.map(p => p.module))];
        // Initialiser l'état des modules (tous fermés par défaut)
        this.permissionModules.forEach(module => {
          if (!(module in this.moduleCollapseState)) {
            this.moduleCollapseState[module] = false;
          }
        });
        this.loadingPermissions = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des permissions:', error);
        this.loadingPermissions = false;
        this.cdr.detectChanges();
      }
    });
  }

  filterRoles(): void {
    const filterValue = this.filterControl.value;
    switch (filterValue) {
      case 'predefined':
        this.filteredRoles = this.roles.filter(role => role.is_predefined);
        break;
      case 'custom':
        this.filteredRoles = this.roles.filter(role => !role.is_predefined);
        break;
      default:
        this.filteredRoles = [...this.roles];
    }
  }

  getModulePermissions(module: string): Permission[] {
    return this.permissions.filter(p => p.module === module);
  }

  onPermissionChange(permission: Permission, event: any): void {
    if (event.target.checked) {
      this.selectedPermissions.add(permission.id);
    } else {
      this.selectedPermissions.delete(permission.id);
    }
    // Déclencher la détection de changement pour mettre à jour l'UI
    this.cdr.detectChanges();
  }

  getSelectedModulePermissionsCount(module: string): number {
    const modulePermissions = this.getModulePermissions(module);
    return modulePermissions.filter(p => this.selectedPermissions.has(p.id)).length;
  }

  toggleModuleCollapse(module: string): void {
    this.moduleCollapseState[module] = !this.moduleCollapseState[module];
    this.cdr.detectChanges();
  }

  isModuleExpanded(module: string): boolean {
    return this.moduleCollapseState[module] || false;
  }

  editRole(role: Role): void {
    this.isEditing = true;
    this.editingRoleId = role.id;

    this.roleForm.patchValue({
      name: role.name,
      display_name: role.display_name,
      description: role.description
    });

    // Charger les permissions du rôle
    this.selectedPermissions.clear();
    if (role.permissions) {
      role.permissions.forEach(p => this.selectedPermissions.add(p.id));
    }
  }

  viewPermissions(role: Role): void {
    // TODO: Ouvrir un modal ou naviguer vers une page de détails des permissions
    console.log('Permissions du rôle', role.display_name, role.permissions);
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.editingRoleId = null;
    this.roleForm.reset();
    this.selectedPermissions.clear();
  }

  saveRole(): void {
    if (this.roleForm.valid) {
      this.submitting = true;

      const roleData = {
        ...this.roleForm.value,
        permissions: Array.from(this.selectedPermissions)
      };

      const operation = this.isEditing && this.editingRoleId ?
        this.authPermissions.updateRole(this.editingRoleId, roleData) :
        this.authPermissions.createRole(roleData);

      operation.subscribe({
        next: (role) => {
          this.messageService.showSuccess(
            this.isEditing ? 'Rôle modifié avec succès' : 'Rôle créé avec succès'
          );
          this.loadRoles();
          this.cancelEdit();
          this.submitting = false;
        },
        error: (error) => {
          console.error('Erreur lors de l\'enregistrement du rôle:', error);
          this.messageService.showError('Erreur lors de l\'enregistrement du rôle');
          this.submitting = false;
        }
      });
    }
  }

  deleteRole(role: Role): void {
    if (confirm(`Êtes-vous sûr de vouloir supprimer le rôle "${role.display_name}" ?`)) {
      this.authPermissions.deleteRole(role.id).subscribe({
        next: () => {
          this.messageService.showSuccess('Rôle supprimé avec succès');
          this.loadRoles();
        },
        error: (error) => {
          console.error('Erreur lors de la suppression du rôle:', error);
          this.messageService.showError('Erreur lors de la suppression du rôle');
        }
      });
    }
  }
}