import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { UserService, User, Role } from '../user-management/user.service';
import { SimpleNotificationService } from '../../../shared/services/simple-notification.service';
import { ConfirmationModalComponent } from '../../../shared/components/confirmation-modal/confirmation-modal.component';

interface UserWithRoles extends User {
  loading?: boolean;
}

@Component({
  selector: 'app-users-roles',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ConfirmationModalComponent],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      <div class="max-w-7xl mx-auto">
        <!-- En-tête -->
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-slate-800 mb-2">Attribution des rôles</h1>
          <p class="text-slate-600">Assigner et gérer les rôles des utilisateurs</p>
        </div>

        <!-- Statistiques -->
        <div class="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg border border-white/60 p-6 mb-6">
          <h3 class="text-lg font-semibold text-slate-800 mb-4">Statistiques</h3>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <!-- Total utilisateurs -->
            <div class="flex items-center p-4 bg-blue-50 rounded-lg">
              <div class="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
                <i class="bi bi-people text-white text-xl"></i>
              </div>
              <div>
                <p class="text-sm font-medium text-gray-500">Total utilisateurs</p>
                <p class="text-2xl font-bold text-gray-900">{{ getTotalUsers() }}</p>
              </div>
            </div>

            <!-- Avec rôles -->
            <div class="flex items-center p-4 bg-green-50 rounded-lg">
              <div class="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mr-3">
                <i class="bi bi-check-circle text-white text-xl"></i>
              </div>
              <div>
                <p class="text-sm font-medium text-gray-500">Avec rôles</p>
                <p class="text-2xl font-bold text-gray-900">{{ getUsersWithRoles() }}</p>
              </div>
            </div>

            <!-- Sans rôles -->
            <div class="flex items-center p-4 bg-red-50 rounded-lg">
              <div class="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center mr-3">
                <i class="bi bi-x-circle text-white text-xl"></i>
              </div>
              <div>
                <p class="text-sm font-medium text-gray-500">Sans rôles</p>
                <p class="text-2xl font-bold text-gray-900">{{ getUsersWithoutRoles() }}</p>
              </div>
            </div>

            <!-- Rôles actifs -->
            <div class="flex items-center p-4 bg-purple-50 rounded-lg">
              <div class="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mr-3">
                <i class="bi bi-shield text-white text-xl"></i>
              </div>
              <div>
                <p class="text-sm font-medium text-gray-500">Rôles actifs</p>
                <p class="text-2xl font-bold text-gray-900">{{ getActiveRoles() }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Filtres et actions -->
        <div class="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg border border-white/60 p-4 mb-6">
          <div class="flex flex-col sm:flex-row gap-4 items-center">
            <!-- Recherche -->
            <div class="flex-1 relative">
              <input
                type="text"
                [formControl]="searchControl"
                placeholder="Rechercher par nom ou email..."
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white pr-10"
              />
              <i class="bi bi-search absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
            </div>

            <!-- Filtre par rôle -->
            <div class="w-full sm:w-64">
              <select
                [formControl]="roleFilter"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white">
                <option value="">Tous les rôles</option>
                @for (role of roles(); track role.id) {
                  <option [value]="role.id.toString()">{{ role.display_name || role.name }}</option>
                }
              </select>
            </div>

            <!-- Actualiser -->
            <button
              (click)="refreshData()"
              class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
              <i class="bi bi-arrow-clockwise"></i>
              <span>Actualiser</span>
            </button>
          </div>
        </div>

        <!-- Grille des utilisateurs -->
        @if (loading()) {
          <div class="flex items-center justify-center py-12">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span class="ml-3 text-slate-600">Chargement des utilisateurs...</span>
          </div>
        } @else {
          @if (filteredUsers().length > 0) {
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              @for (user of filteredUsers(); track user.id) {
                <div class="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg border border-white/60 p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
                  <!-- En-tête de la carte utilisateur -->
                  <div class="flex items-center space-x-4 mb-4">
                    <div class="relative">
                      <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                        <span class="text-white font-bold text-lg">{{ getUserInitials(user) }}</span>
                      </div>
                      <!-- Indicateur de statut -->
                      <div class="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center"
                           [class]="user.status === 'active' ? 'bg-green-500' : 'bg-red-500'">
                        <i [class]="user.status === 'active' ? 'bi bi-check text-white text-xs' : 'bi bi-x text-white text-xs'"></i>
                      </div>
                    </div>
                    <div class="flex-1 min-w-0">
                      <h3 class="text-lg font-bold text-slate-800 truncate">{{ getUserDisplayName(user) }}</h3>
                      <p class="text-sm text-slate-600 truncate">{{ user.email }}</p>
                      <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1"
                            [class]="user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
                        {{ user.status === 'active' ? 'Actif' : 'Inactif' }}
                      </span>
                    </div>
                  </div>

                  <!-- Section des rôles -->
                  <div class="mb-4">
                    <div class="flex items-center justify-between mb-3">
                      <h4 class="text-sm font-semibold text-slate-700">Rôles assignés</h4>
                      <span class="px-2 py-1 bg-blue-100 text-blue-600 rounded-full text-xs font-medium">
                        {{ user.roles.length || 0 }}
                      </span>
                    </div>

                    <div class="space-y-2 min-h-[60px]">
                      @if (user.roles && user.roles.length > 0) {
                        @for (role of user.roles; track role.id) {
                          <div class="flex items-center justify-between p-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                            <div class="flex items-center space-x-2">
                              <div class="w-2 h-2 rounded-full bg-blue-500"></div>
                              <span class="text-sm font-medium text-blue-700">{{ role.display_name || role.name }}</span>
                            </div>
                            <button
                              (click)="confirmRemoveUserRole(user, role)"
                              [disabled]="user.loading || false"
                              class="p-1 rounded-full text-blue-400 hover:text-red-500 hover:bg-red-100 transition-all duration-200 flex-shrink-0"
                              title="Retirer ce rôle">
                              <i class="bi bi-x-lg text-xs"></i>
                            </button>
                          </div>
                        }
                      } @else {
                        <div class="flex items-center justify-center p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                          <div class="text-center">
                            <i class="bi bi-shield-x text-2xl text-gray-400 mb-2"></i>
                            <p class="text-sm text-gray-500">Aucun rôle assigné</p>
                          </div>
                        </div>
                      }
                    </div>
                  </div>

                  <!-- Section d'assignation -->
                  <div class="border-t border-gray-200 pt-4">
                    <h4 class="text-sm font-semibold text-slate-700 mb-3">Assigner un nouveau rôle</h4>
                    <div class="space-y-3">
                      <select
                        [formControl]="getUserRoleControl(user.id)"
                        [disabled]="user.loading || false"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white text-sm">
                        <option value="">Choisir un rôle...</option>
                        @for (role of getAvailableRoles(user); track role.id) {
                          <option [value]="role.id.toString()">{{ role.display_name || role.name }}</option>
                        }
                      </select>

                      <button
                        (click)="assignUserRole(user)"
                        [disabled]="!getUserRoleControl(user.id).value || (user.loading || false)"
                        class="w-full px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-lg transition-all duration-200 text-sm font-medium flex items-center justify-center space-x-2 shadow-md hover:shadow-lg">
                        @if (user.loading) {
                          <i class="bi bi-arrow-clockwise animate-spin"></i>
                          <span>Attribution en cours...</span>
                        } @else {
                          <i class="bi bi-plus-circle"></i>
                          <span>Assigner le rôle</span>
                        }
                      </button>
                    </div>
                  </div>
                </div>
              }
            </div>
          } @else {
            <div class="text-center py-12">
              <div class="max-w-md mx-auto">
                <div class="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                  <i class="bi bi-people text-4xl text-gray-400"></i>
                </div>
                <h3 class="text-xl font-semibold text-slate-800 mb-3">Aucun utilisateur trouvé</h3>
                <p class="text-slate-600 mb-6">
                  {{ searchControl.value || roleFilter.value ? 'Aucun utilisateur ne correspond à vos critères de recherche.' : 'Aucun utilisateur disponible dans le système.' }}
                </p>
                @if (searchControl.value || roleFilter.value) {
                  <button
                    (click)="clearFilters()"
                    class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Effacer les filtres
                  </button>
                }
              </div>
            </div>
          }
        }
      </div>
    </div>

    <!-- Modal de confirmation pour retirer un rôle -->
    <app-confirmation-modal
      [isVisible]="showRemoveConfirmation"
      [title]="'Confirmer le retrait du rôle'"
      [message]="getRemoveRoleMessage()"
      [confirmText]="'Retirer'"
      [cancelText]="'Annuler'"
      [type]="'warning'"
      (confirmed)="onConfirmRemoveRole()"
      (cancelled)="onCancelRemoveRole()">
    </app-confirmation-modal>
  `
})
export class UsersRolesComponent implements OnInit {
  private userService = inject(UserService);
  private notificationService = inject(SimpleNotificationService);

  users = signal<UserWithRoles[]>([]);
  filteredUsers = signal<UserWithRoles[]>([]);
  roles = signal<Role[]>([]);
  userRoleControls: { [userId: number]: FormControl } = {};

  loading = signal(false);
  showRemoveConfirmation = false;
  userToRemoveRole: { user: UserWithRoles, role: Role } | null = null;

  // Filtres
  searchControl = new FormControl('');
  roleFilter = new FormControl('');

  ngOnInit(): void {
    this.loadUsers();
    this.loadRoles();
    this.setupFilters();
  }

  setupFilters(): void {
    this.searchControl.valueChanges.subscribe(() => this.applyFilters());
    this.roleFilter.valueChanges.subscribe(() => this.applyFilters());
  }

  loadUsers(): void {
    this.loading.set(true);
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        this.users.set(users.map(user => ({ ...user, loading: false })));
        this.applyFilters();
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des utilisateurs:', error);
        this.notificationService.showError(
          'Erreur lors du chargement des utilisateurs',
          'Erreur'
        );
        this.loading.set(false);
      }
    });
  }

  loadRoles(): void {
    this.userService.getRoles().subscribe({
      next: (roles) => {
        this.roles.set(roles);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des rôles:', error);
        this.notificationService.showError(
          'Erreur lors du chargement des rôles',
          'Erreur'
        );
      }
    });
  }

  applyFilters(): void {
    let filtered = [...this.users()];

    // Filtre par recherche
    if (this.searchControl.value) {
      const search = this.searchControl.value.toLowerCase();
      filtered = filtered.filter(user =>
        user.first_name?.toLowerCase().includes(search) ||
        user.last_name?.toLowerCase().includes(search) ||
        user.name?.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search)
      );
    }

    // Filtre par rôle
    if (this.roleFilter.value) {
      const roleId = parseInt(this.roleFilter.value);
      filtered = filtered.filter(user =>
        user.roles && user.roles.some(role => role.id === roleId)
      );
    }

    this.filteredUsers.set(filtered);
  }

  getAvailableRoles(user: UserWithRoles): Role[] {
    const userRoleIds = user.roles?.map(role => role.id) || [];
    return this.roles().filter(role => !userRoleIds.includes(role.id));
  }

  assignUserRole(user: UserWithRoles): void {
    const roleControl = this.getUserRoleControl(user.id);
    const roleId = roleControl.value;
    if (!roleId) return;

    user.loading = true;

    this.userService.assignUserRole(user.id, parseInt(roleId)).subscribe({
      next: () => {
        // Recharger les informations de l'utilisateur
        this.userService.getUserById(user.id).subscribe({
          next: (updatedUser) => {
            // Mettre à jour l'utilisateur dans la liste
            this.users.update(users =>
              users.map(u => u.id === user.id ? { ...updatedUser, loading: false } : u)
            );

            roleControl.setValue(''); // Reset selection
            this.applyFilters();

            this.notificationService.showSuccess(
              `Rôle assigné à ${this.getUserDisplayName(user)}`,
              'Rôle assigné'
            );
          },
          error: (error) => {
            console.error('Erreur lors du rechargement de l\'utilisateur:', error);
            user.loading = false;
          }
        });
      },
      error: (error) => {
        console.error('Erreur lors de l\'assignation du rôle:', error);
        this.notificationService.showError(
          'Erreur lors de l\'assignation du rôle',
          'Erreur'
        );
        user.loading = false;
      }
    });
  }

  confirmRemoveUserRole(user: UserWithRoles, role: Role): void {
    this.userToRemoveRole = { user, role };
    this.showRemoveConfirmation = true;
  }

  onConfirmRemoveRole(): void {
    if (!this.userToRemoveRole) return;

    const { user, role } = this.userToRemoveRole;
    user.loading = true;

    this.userService.removeUserRole(user.id, role.id).subscribe({
      next: () => {
        // Recharger les informations de l'utilisateur
        this.userService.getUserById(user.id).subscribe({
          next: (updatedUser) => {
            // Mettre à jour l'utilisateur dans la liste
            this.users.update(users =>
              users.map(u => u.id === user.id ? { ...updatedUser, loading: false } : u)
            );

            this.notificationService.showSuccess(
              `Rôle ${role.display_name || role.name} retiré de ${this.getUserDisplayName(user)}`,
              'Rôle retiré'
            );

            this.onCancelRemoveRole();
            this.applyFilters();
          },
          error: (error) => {
            console.error('Erreur lors du rechargement de l\'utilisateur:', error);
            user.loading = false;
            this.onCancelRemoveRole();
          }
        });
      },
      error: (error) => {
        console.error('Erreur lors du retrait du rôle:', error);
        this.notificationService.showError(
          'Erreur lors du retrait du rôle',
          'Erreur'
        );
        user.loading = false;
        this.onCancelRemoveRole();
      }
    });
  }

  onCancelRemoveRole(): void {
    this.showRemoveConfirmation = false;
    this.userToRemoveRole = null;
  }

  getRemoveRoleMessage(): string {
    if (!this.userToRemoveRole) return '';
    const { user, role } = this.userToRemoveRole;
    return `Êtes-vous sûr de vouloir retirer le rôle "${role.display_name || role.name}" de ${this.getUserDisplayName(user)} ?`;
  }

  getUserRoleControl(userId: number): FormControl {
    if (!this.userRoleControls[userId]) {
      this.userRoleControls[userId] = new FormControl('');
    }
    return this.userRoleControls[userId];
  }

  refreshData(): void {
    this.loadUsers();
    this.loadRoles();
  }

  clearFilters(): void {
    this.searchControl.setValue('');
    this.roleFilter.setValue('');
  }

  // Méthodes utilitaires
  getUserInitials(user: UserWithRoles): string {
    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    const firstInitial = firstName.charAt(0) || '';
    const lastInitial = lastName.charAt(0) || '';
    return (firstInitial + lastInitial).toUpperCase() || 'U';
  }

  getUserDisplayName(user: UserWithRoles): string {
    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    } else if (firstName) {
      return firstName;
    } else if (lastName) {
      return lastName;
    } else if (user.name) {
      return user.name;
    } else {
      return user.email || 'Utilisateur';
    }
  }

  // Statistiques
  getTotalUsers(): number {
    return this.users().length;
  }

  getUsersWithRoles(): number {
    return this.users().filter(user => user.roles && user.roles.length > 0).length;
  }

  getUsersWithoutRoles(): number {
    return this.users().filter(user => !user.roles || user.roles.length === 0).length;
  }

  getActiveRoles(): number {
    return this.roles().length;
  }
}