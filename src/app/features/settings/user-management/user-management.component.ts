import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { UserService, User, CreateUserRequest, UpdateUserRequest, UserStats, PaginatedResponse, Role } from './user.service';
import { ConfirmationModalComponent } from '../../../shared/components/confirmation-modal/confirmation-modal.component';
import { SimpleNotificationService } from '../../../shared/services/simple-notification.service';


@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ConfirmationModalComponent],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      <div class="max-w-7xl mx-auto">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <div>
            <h1 class="text-2xl font-bold text-slate-800 mb-2">Gestion des utilisateurs</h1>
            <p class="text-sm text-slate-600">Créer, modifier et gérer les comptes utilisateurs</p>
          </div>
          <button
            (click)="openCreateForm()"
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
            <i class="bi bi-plus-circle"></i>
            <span>Nouvel utilisateur</span>
          </button>
        </div>

        <!-- Statistics Section -->
        <div *ngIf="userStats()" class="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg border border-white/60 p-6 mb-6">
          <h3 class="text-lg font-semibold text-slate-800 mb-4">Statistiques des utilisateurs</h3>

          <!-- Main Stats - Compact Grid -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <!-- Total Users -->
            <div class="flex items-center p-3 bg-blue-50 rounded-lg">
              <div class="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
                <i class="bi bi-people text-white"></i>
              </div>
              <div>
                <p class="text-xs font-medium text-gray-500">Total</p>
                <p class="text-xl font-bold text-gray-900">{{ userStats()!.total_users }}</p>
              </div>
            </div>

            <!-- Active Users -->
            <div class="flex items-center p-3 bg-green-50 rounded-lg">
              <div class="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center mr-3">
                <i class="bi bi-check-circle text-white"></i>
              </div>
              <div>
                <p class="text-xs font-medium text-gray-500">Actifs</p>
                <p class="text-xl font-bold text-gray-900">{{ userStats()!.active_users }}</p>
              </div>
            </div>

            <!-- Inactive Users -->
            <div class="flex items-center p-3 bg-red-50 rounded-lg">
              <div class="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center mr-3">
                <i class="bi bi-pause-circle text-white"></i>
              </div>
              <div>
                <p class="text-xs font-medium text-gray-500">Inactifs</p>
                <p class="text-xl font-bold text-gray-900">{{ userStats()!.inactive_users }}</p>
              </div>
            </div>

            <!-- Recent Registrations -->
            <div class="flex items-center p-3 bg-purple-50 rounded-lg">
              <div class="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center mr-3">
                <i class="bi bi-person-plus text-white"></i>
              </div>
              <div>
                <p class="text-xs font-medium text-gray-500">Nouveaux</p>
                <p class="text-xl font-bold text-gray-900">{{ userStats()!.recent_registrations }}</p>
              </div>
            </div>
          </div>

          <!-- Role Distribution -->
          <div *ngIf="userStats()!.users_by_role" class="border-t border-gray-200 pt-4">
            <h4 class="text-md font-medium text-slate-700 mb-3">Répartition par rôles</h4>
            <div class="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3">
              <div *ngFor="let role of getObjectKeys(userStats()!.users_by_role)" class="text-center">
                <div class="w-12 h-12 mx-auto mb-1 rounded-full border-3 border-blue-400 flex items-center justify-center bg-blue-50">
                  <span class="text-sm font-bold text-blue-600">{{ userStats()!.users_by_role[role] }}</span>
                </div>
                <p class="text-xs font-medium text-gray-600">{{ getRoleLabel(role) }}</p>
              </div>
            </div>
          </div>
        </div>


        <!-- Users List -->
        <div class="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg border border-white/60">
          <!-- Search and Filters -->
          <div class="p-6 border-b border-gray-200/60">
            <div class="flex flex-col sm:flex-row gap-4 items-center">
              <!-- Search Bar - Left -->
              <div class="flex-1 relative">
                <input
                  type="text"
                  placeholder="Rechercher par nom, email... (min. 2 caractères pour recherche serveur)"
                  [(ngModel)]="searchTerm"
                  (input)="filterUsers()"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white pr-10"
                />
                @if (isSearching()) {
                  <div class="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <i class="bi bi-arrow-clockwise animate-spin text-blue-500"></i>
                  </div>
                }
                @if (searchTerm && searchTerm.length >= 2) {
                  <div class="absolute right-12 top-1/2 transform -translate-y-1/2">
                    <i class="bi bi-server text-green-500" title="Recherche serveur"></i>
                  </div>
                } @else if (searchTerm && searchTerm.length === 1) {
                  <div class="absolute right-12 top-1/2 transform -translate-y-1/2">
                    <i class="bi bi-laptop text-blue-500" title="Recherche locale"></i>
                  </div>
                }
              </div>

              <!-- Filters - Right -->
              <div class="flex gap-3 sm:ml-auto">
                <select
                  [(ngModel)]="roleFilter"
                  (change)="filterUsers()"
                  class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white min-w-[160px]"
                >
                  <option value="" class="text-gray-900">Tous les rôles</option>
                  @if (roles() && roles().length > 0) {
                    @for (role of roles(); track role.id) {
                      <option [value]="role.name" class="text-gray-900">{{ role.display_name || role.name }}</option>
                    }
                  }
                </select>
                <select
                  [(ngModel)]="statusFilter"
                  (change)="filterUsers()"
                  class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white min-w-[140px]"
                >
                  <option value="" class="text-gray-900">Tous les statuts</option>
                  <option value="active" class="text-gray-900">Actif</option>
                  <option value="inactive" class="text-gray-900">Inactif</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Table -->
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-50/50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilisateur</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rôle</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dernière connexion</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr *ngFor="let user of filteredUsers()" class="hover:bg-gray-50/50 transition-colors">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                      <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                        <span class="text-sm font-medium text-white">
                          {{ getUserInitials(user) }}
                        </span>
                      </div>
                      <div class="ml-3">
                        <div class="text-sm font-medium text-gray-900">{{ getUserDisplayName(user) }}</div>
                        <div class="text-sm text-gray-500">{{ user.id }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{{ user.email }}</td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span [class]="getRoleBadgeClass(user.roles[0]?.name || 'user')" class="px-2 py-1 text-xs font-semibold rounded-full">
                      {{ getRoleLabel(user.roles[0]?.display_name || user.roles[0]?.name || 'Utilisateur') }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <span [class]="user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
                          class="px-2 py-1 text-xs font-semibold rounded-full">
                      {{ user.status === 'active' ? 'Actif' : 'Inactif' }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {{ user.last_login ? (user.last_login | date:'dd/MM/yyyy HH:mm') : 'Jamais' }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      (click)="editUser(user)"
                      class="text-blue-600 hover:text-blue-900 transition-colors"
                      title="Modifier">
                      <i class="bi bi-pencil"></i>
                    </button>
                    <button
                      (click)="onToggleUserStatus(user)"
                      [class]="user.status === 'active' ? 'text-orange-600 hover:text-orange-900' : 'text-green-600 hover:text-green-900'"
                      class="transition-colors"
                      [title]="user.status === 'active' ? 'Désactiver' : 'Activer'">
                      <i [class]="user.status === 'active' ? 'bi bi-pause-circle' : 'bi bi-play-circle'"></i>
                    </button>
                    <button
                      (click)="onResetPassword(user)"
                      class="text-purple-600 hover:text-purple-900 transition-colors"
                      title="Réinitialiser mot de passe">
                      <i class="bi bi-key"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Empty State -->
          <div *ngIf="filteredUsers().length === 0" class="text-center py-12">
            <i class="bi bi-people text-4xl text-gray-400 mb-4"></i>
            <h3 class="text-lg font-medium text-gray-900 mb-2">Aucun utilisateur trouvé</h3>
            <p class="text-gray-500">Aucun utilisateur ne correspond à vos critères de recherche.</p>
          </div>

          <!-- Pagination -->
          <div *ngIf="paginationInfo()" class="px-6 py-3 border-t border-gray-200/60">
            <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
              <!-- Info and Per Page -->
              <div class="flex items-center gap-4">
                <div class="text-sm text-gray-700">
                  Affichage de <strong>{{ paginationInfo()!.from }}</strong> à <strong>{{ paginationInfo()!.to }}</strong>
                  sur <strong>{{ paginationInfo()!.total }}</strong> utilisateur(s)
                </div>
                <div class="flex items-center gap-2">
                  <label class="text-sm text-gray-600">Par page:</label>
                  <select
                    [(ngModel)]="perPage"
                    (ngModelChange)="onPerPageChange($event)"
                    class="text-sm border border-gray-300 rounded px-2 py-1 bg-white text-gray-900">
                    <option value="10">10</option>
                    <option value="15">15</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                  </select>
                </div>
              </div>

              <!-- Page Navigation -->
              <div *ngIf="paginationInfo()!.last_page > 1" class="flex items-center gap-1">
                <!-- Previous Button -->
                <button
                  (click)="onPageChange(currentPage - 1)"
                  [disabled]="currentPage <= 1"
                  class="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                  Précédent
                </button>

                <!-- First Page -->
                <button *ngIf="getPageNumbers()[0] > 1"
                  (click)="onPageChange(1)"
                  class="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                  1
                </button>
                <span *ngIf="getPageNumbers()[0] > 2" class="px-2 text-gray-500">...</span>

                <!-- Page Numbers -->
                <button *ngFor="let page of getPageNumbers()"
                  (click)="onPageChange(page)"
                  [class]="page === currentPage ?
                    'px-3 py-1 text-sm border border-blue-500 bg-blue-500 text-white rounded' :
                    'px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50'">
                  {{ page }}
                </button>

                <!-- Last Page -->
                <span *ngIf="getPageNumbers()[getPageNumbers().length - 1] < paginationInfo()!.last_page - 1" class="px-2 text-gray-500">...</span>
                <button *ngIf="getPageNumbers()[getPageNumbers().length - 1] < paginationInfo()!.last_page"
                  (click)="onPageChange(paginationInfo()!.last_page)"
                  class="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                  {{ paginationInfo()!.last_page }}
                </button>

                <!-- Next Button -->
                <button
                  (click)="onPageChange(currentPage + 1)"
                  [disabled]="currentPage >= paginationInfo()!.last_page"
                  class="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                  Suivant
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirmation Modals -->

<!-- Toggle Status Confirmation Modal -->
    <app-confirmation-modal
      [isVisible]="showStatusConfirmation"
      [title]="'Confirmer le changement de statut'"
      [message]="getStatusToggleMessage()"
      [confirmText]="getStatusToggleConfirmText()"
      [cancelText]="'Annuler'"
      [type]="userToToggleStatus?.status === 'active' ? 'warning' : 'info'"
      (confirmed)="onConfirmStatusToggle()"
      (cancelled)="onCancelStatusToggle()">
    </app-confirmation-modal>

    <!-- Reset Password Confirmation Modal -->
    <app-confirmation-modal
      [isVisible]="showPasswordResetConfirmation"
      [title]="'Confirmer la réinitialisation du mot de passe'"
      [message]="getPasswordResetMessage()"
      [confirmText]="'Réinitialiser'"
      [cancelText]="'Annuler'"
      [type]="'warning'"
      (confirmed)="onConfirmPasswordReset()"
      (cancelled)="onCancelPasswordReset()">
    </app-confirmation-modal>

    <!-- Create/Edit User Modal -->
    @if (showCreateForm) {
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" (click)="closeUserModal()">
        <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 class="text-xl font-semibold text-slate-800">{{ getFormTitle() }}</h2>
            <button
              (click)="closeUserModal()"
              class="text-gray-500 hover:text-red-600 transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <form [formGroup]="createUserForm" (ngSubmit)="isEditMode ? onUpdateUser() : onCreateUser()" class="p-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-2">Prénom *</label>
                <input
                  type="text"
                  formControlName="first_name"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  placeholder="Entrez le prénom"
                />
                <div *ngIf="createUserForm.get('first_name')?.invalid && createUserForm.get('first_name')?.touched"
                     class="text-red-500 text-xs mt-1">
                  Le prénom est requis
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-700 mb-2">Nom *</label>
                <input
                  type="text"
                  formControlName="last_name"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  placeholder="Entrez le nom"
                />
                <div *ngIf="createUserForm.get('last_name')?.invalid && createUserForm.get('last_name')?.touched"
                     class="text-red-500 text-xs mt-1">
                  Le nom est requis
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-700 mb-2">Email *</label>
                <div class="relative">
                  <input
                    type="email"
                    formControlName="email"
                    (input)="onEmailChange()"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white pr-10"
                    placeholder="email@exemple.com"
                  />
                  @if (isEmailValidating()) {
                    <div class="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <i class="bi bi-arrow-clockwise animate-spin text-blue-500"></i>
                    </div>
                  } @else if (emailValidationResult()) {
                    <div class="absolute right-3 top-1/2 transform -translate-y-1/2">
                      @if (emailValidationResult()!.isValid) {
                        <i class="bi bi-check-circle text-green-500"></i>
                      } @else {
                        <i class="bi bi-x-circle text-red-500"></i>
                      }
                    </div>
                  }
                </div>

                <div *ngIf="createUserForm.get('email')?.invalid && createUserForm.get('email')?.touched"
                     class="text-red-500 text-xs mt-1">
                  Un email valide est requis
                </div>

                @if (emailValidationResult()) {
                  <div class="text-xs mt-1"
                       [class]="emailValidationResult()!.isValid ? 'text-green-600' : 'text-red-600'">
                    {{ emailValidationResult()!.message }}
                  </div>
                }
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-700 mb-2">Rôle *</label>
                <select
                  formControlName="role_id"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                >
                  <option value="" class="text-gray-900">Sélectionner un rôle</option>
                  @if (roles() && roles().length > 0) {
                    @for (role of roles(); track role.id) {
                      <option [value]="role.id" class="text-gray-900">{{ role.display_name || role.name }}</option>
                    }
                  }
                </select>
                <div *ngIf="createUserForm.get('role_id')?.invalid && createUserForm.get('role_id')?.touched"
                     class="text-red-500 text-xs mt-1">
                  Un rôle est requis
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-700 mb-2">Mot de passe *</label>
                <input
                  type="password"
                  formControlName="password"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  placeholder="Entrez le mot de passe"
                />
                <div *ngIf="createUserForm.get('password')?.invalid && createUserForm.get('password')?.touched"
                     class="text-red-500 text-xs mt-1">
                  Un mot de passe est requis (min. 8 caractères)
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-700 mb-2">Confirmer le mot de passe *</label>
                <input
                  type="password"
                  formControlName="password_confirmation"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  placeholder="Confirmez le mot de passe"
                />
                <div *ngIf="createUserForm.get('password_confirmation')?.invalid && createUserForm.get('password_confirmation')?.touched"
                     class="text-red-500 text-xs mt-1">
                  La confirmation du mot de passe est requise
                </div>
                <div *ngIf="createUserForm.hasError('passwordMismatch') && createUserForm.get('password_confirmation')?.touched"
                     class="text-red-500 text-xs mt-1">
                  Les mots de passe ne correspondent pas
                </div>
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-700 mb-2">Statut</label>
                <select
                  formControlName="status"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                >
                  <option value="active" class="text-gray-900">Actif</option>
                  <option value="inactive" class="text-gray-900">Inactif</option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-700 mb-2">Téléphone</label>
                <input
                  type="tel"
                  formControlName="phone"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  placeholder="Ex: +33123456789"
                />
              </div>

              <div class="md:col-span-2">
                <label class="block text-sm font-medium text-slate-700 mb-2">Département</label>
                <input
                  type="text"
                  formControlName="department"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  placeholder="Ex: Commercial, Marketing, IT..."
                />
              </div>
            </div>

            <div class="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
              <button
                type="button"
                (click)="closeUserModal()"
                class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                [disabled]="createUserForm.invalid || isLoading()"
                class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                @if (isLoading()) {
                  <i class="bi bi-arrow-clockwise animate-spin"></i>
                  <span>{{ isEditMode ? 'Modification...' : 'Création...' }}</span>
                } @else {
                  <span>{{ getButtonText() }}</span>
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `
})
export class UserManagementComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private userService = inject(UserService);
  private notificationService = inject(SimpleNotificationService);

  createUserForm!: FormGroup;
  showCreateForm = false;
  editingUserId: number | null = null;
  isEditMode = false;

  // Confirmation modal state
  showStatusConfirmation = false;
  showPasswordResetConfirmation = false;
  userToToggleStatus: User | null = null;
  userToResetPassword: User | null = null;
  isLoading = signal(false);
  isSearching = signal(false);
  isEmailValidating = signal(false);
  emailValidationResult = signal<{ isValid: boolean; message: string } | null>(null);
  searchTerm = '';
  roleFilter = '';
  statusFilter = '';

  users = signal<User[]>([]);
  filteredUsers = signal<User[]>([]);
  userStats = signal<UserStats | null>(null);
  roles = signal<Role[]>([]);
  paginationInfo = signal<{
    current_page: number;
    total: number;
    per_page: number;
    last_page: number;
    from: number;
    to: number;
  } | null>(null);

  // Pagination controls
  currentPage = 1;
  perPage = 15;

  private searchSubject = new Subject<string>();
  private emailValidationSubject = new Subject<{ email: string; excludeId?: number }>();

  ngOnInit(): void {
    this.initializeForm();
    this.loadUsersAndRoles();
    this.loadUserStats();
    this.setupSearchDebounce();
  }

  private loadUsersAndRoles(): void {
    this.loadUsers();
    this.loadRoles();
  }

  private setupSearchDebounce(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(term => {
      this.performSearchWithDebounce(term);
    });

    this.emailValidationSubject.pipe(
      debounceTime(500),
      distinctUntilChanged((prev, curr) => prev.email === curr.email && prev.excludeId === curr.excludeId)
    ).subscribe(({ email, excludeId }) => {
      this.validateEmailWithBackend(email, excludeId);
    });
  }

  loadUsers(): void {
    const filters = {
      page: this.currentPage,
      per_page: this.perPage,
      role: this.roleFilter || undefined,
      status: this.statusFilter || undefined,
      q: this.searchTerm && this.searchTerm.length >= 2 ? this.searchTerm : undefined
    };

    this.userService.getUsers(filters).subscribe({
      next: (response) => {
        this.users.set(response.data);
        this.filteredUsers.set(response.data);
        this.paginationInfo.set({
          current_page: response.current_page,
          total: response.total,
          per_page: response.per_page,
          last_page: response.last_page,
          from: response.from,
          to: response.to
        });
      },
      error: (error) => {
        console.error('Erreur lors du chargement des utilisateurs:', error);
      }
    });
  }

  loadUserStats(): void {
    this.userService.getUserStats().subscribe({
      next: (stats) => {
        this.userStats.set(stats);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des statistiques:', error);
      }
    });
  }

  loadRoles(): void {
    this.userService.getRoles().subscribe({
      next: (roles) => {
        // Ensure we always set an array
        this.roles.set(Array.isArray(roles) ? roles : []);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des rôles:', error);
        // Set empty array on error to prevent iteration issues
        this.roles.set([]);
      }
    });
  }


  private initializeForm(): void {
    this.createUserForm = this.fb.group({
      first_name: ['', [Validators.required]],
      last_name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      role_id: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      password_confirmation: ['', [Validators.required]],
      status: ['active'],
      phone: [''],
      department: ['']
    }, {
      validators: this.passwordMatchValidator
    });
  }

  private passwordMatchValidator(form: any): any {
    const password = form.get('password');
    const confirmPassword = form.get('password_confirmation');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }
    return null;
  }

  onCreateUser(): void {
    if (this.createUserForm.valid) {
      this.isLoading.set(true);

      const formValue = this.createUserForm.value;
      const createRequest: CreateUserRequest = {
        first_name: formValue.first_name,
        last_name: formValue.last_name,
        email: formValue.email,
        role_id: parseInt(formValue.role_id),
        password: formValue.password,
        password_confirmation: formValue.password_confirmation,
        status: formValue.status,
        phone: formValue.phone || undefined,
        department: formValue.department || undefined
      };

      this.userService.createUser(createRequest).subscribe({
        next: (newUser) => {
          this.users.update(users => [...users, newUser]);
          this.filterUsers();
          this.loadUserStats(); // Refresh stats after creating user
          this.resetForm();
          this.isLoading.set(false);
          this.showCreateForm = false;
          this.notificationService.showSuccess(
            'L\'utilisateur a été créé avec succès',
            'Utilisateur créé'
          );
        },
        error: (error) => {
          console.error('Erreur lors de la création:', error);
          this.isLoading.set(false);
          this.notificationService.showError(
            error?.message || 'Une erreur est survenue lors de la création de l\'utilisateur',
            'Erreur de création'
          );
        }
      });
    } else {
      this.markFormGroupTouched(this.createUserForm);
    }
  }

  onUpdateUser(): void {
    if (this.createUserForm.valid && this.editingUserId) {
      this.isLoading.set(true);

      const formValue = this.createUserForm.value;
      const updateRequest = {
        first_name: formValue.first_name,
        last_name: formValue.last_name,
        email: formValue.email,
        role_id: parseInt(formValue.role_id),
        status: formValue.status,
        phone: formValue.phone || undefined,
        department: formValue.department || undefined
      };

      this.userService.updateUser(this.editingUserId, updateRequest).subscribe({
        next: (updatedUser) => {
          this.users.update(users =>
            users.map(user => user.id === this.editingUserId ? updatedUser : user)
          );
          this.filterUsers();
          this.loadUserStats(); // Refresh stats after updating user
          this.resetForm();
          this.isLoading.set(false);
          this.showCreateForm = false;
          this.notificationService.showSuccess(
            'L\'utilisateur a été modifié avec succès',
            'Utilisateur mis à jour'
          );
        },
        error: (error) => {
          console.error('Erreur lors de la modification:', error);
          this.isLoading.set(false);
          this.notificationService.showError(
            error?.message || 'Une erreur est survenue lors de la modification de l\'utilisateur',
            'Erreur de modification'
          );
        }
      });
    } else {
      this.markFormGroupTouched(this.createUserForm);
    }
  }

  resetForm(): void {
    this.createUserForm.reset();
    this.createUserForm.patchValue({ status: 'active' });
    this.showCreateForm = false;
    this.isEditMode = false;
    this.editingUserId = null;
    this.emailValidationResult.set(null);
  }

  closeUserModal(): void {
    this.resetForm();
  }

  openCreateForm(): void {
    this.isEditMode = false;
    this.editingUserId = null;

    // Restore password validation for create mode
    this.createUserForm.get('password')?.setValidators([Validators.required, Validators.minLength(8)]);
    this.createUserForm.get('password_confirmation')?.setValidators([Validators.required]);
    this.createUserForm.get('password')?.updateValueAndValidity();
    this.createUserForm.get('password_confirmation')?.updateValueAndValidity();

    this.createUserForm.reset();
    this.createUserForm.patchValue({ status: 'active' });
    this.showCreateForm = true;
    this.emailValidationResult.set(null);
  }

  filterUsers(): void {
    // Reset to first page when filters change
    this.currentPage = 1;
    // Trigger debounced search for search terms
    if (this.searchTerm) {
      this.searchSubject.next(this.searchTerm);
    } else {
      // No search term, reload with current filters
      this.loadUsers();
    }
  }

  private performSearchWithDebounce(term: string): void {
    // For any term, reload with current filters (backend handles the logic)
    this.loadUsers();
  }

  private performSearch(term: string): void {
    this.isSearching.set(true);
    this.userService.searchUsers(term).subscribe({
      next: (searchResults) => {
        let filtered = searchResults;

        // Apply additional filters to search results
        if (this.roleFilter) {
          filtered = filtered.filter(user => user.roles[0]?.name === this.roleFilter);
        }

        if (this.statusFilter) {
          filtered = filtered.filter(user => user.status === this.statusFilter);
        }

        this.filteredUsers.set(filtered);
        this.isSearching.set(false);
      },
      error: (error) => {
        console.error('Erreur lors de la recherche:', error);
        this.isSearching.set(false);
        // Fallback to local filtering on error
        this.filterUsersLocally();
      }
    });
  }

  private filterUsersLocally(): void {
    let filtered = this.users();

    if (this.searchTerm) {
      const search = this.searchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        user.first_name.toLowerCase().includes(search) ||
        user.last_name.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search)
      );
    }

    if (this.roleFilter) {
      filtered = filtered.filter(user => user.roles[0]?.name === this.roleFilter);
    }

    if (this.statusFilter) {
      filtered = filtered.filter(user => user.status === this.statusFilter);
    }

    this.filteredUsers.set(filtered);
  }

  private validateEmailWithBackend(email: string, excludeId?: number): void {
    if (!email || !email.includes('@')) {
      this.emailValidationResult.set(null);
      return;
    }

    this.isEmailValidating.set(true);
    this.userService.validateEmailUniqueness(email, excludeId).subscribe({
      next: (result) => {
        if (result.is_available) {
          this.emailValidationResult.set({
            isValid: true,
            message: 'Email disponible ✓'
          });
        } else {
          this.emailValidationResult.set({
            isValid: false,
            message: 'Cet email est déjà utilisé'
          });
        }
        this.isEmailValidating.set(false);
      },
      error: (error) => {
        console.error('Erreur lors de la validation email:', error);
        this.emailValidationResult.set({
          isValid: false,
          message: 'Erreur lors de la validation'
        });
        this.isEmailValidating.set(false);
      }
    });
  }

  onEmailChange(): void {
    const email = this.createUserForm.get('email')?.value;
    if (email) {
      const excludeId = this.isEditMode ? this.editingUserId || undefined : undefined;
      this.emailValidationSubject.next({ email, excludeId });
    } else {
      this.emailValidationResult.set(null);
    }
  }

  editUser(user: User): void {
    this.isEditMode = true;
    this.editingUserId = user.id;

    // Remove password validation for edit mode
    this.createUserForm.get('password')?.clearValidators();
    this.createUserForm.get('password_confirmation')?.clearValidators();
    this.createUserForm.get('password')?.updateValueAndValidity();
    this.createUserForm.get('password_confirmation')?.updateValueAndValidity();

    // Pré-remplir le formulaire avec les données de l'utilisateur
    this.createUserForm.patchValue({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      role_id: user.roles[0]?.id || 1,
      status: user.status,
      password: '',
      password_confirmation: '',
      phone: user.phone || '',
      department: user.department || ''
    });
    this.showCreateForm = true;
  }

  onToggleUserStatus(user: User): void {
    this.userToToggleStatus = user;
    this.showStatusConfirmation = true;
  }

  onConfirmStatusToggle(): void {
    if (!this.userToToggleStatus) return;

    this.userService.toggleUserStatus(this.userToToggleStatus.id).subscribe({
      next: (updatedUser) => {
        this.users.update(users =>
          users.map(u => u.id === this.userToToggleStatus!.id ? updatedUser : u)
        );
        this.filterUsers();
        this.loadUserStats(); // Refresh stats after status change
        this.notificationService.showSuccess(
          `Utilisateur ${updatedUser.status === 'active' ? 'activé' : 'désactivé'} avec succès`,
          'Statut modifié'
        );
        this.onCancelStatusToggle();
      },
      error: (error) => {
        console.error('Erreur lors du changement de statut:', error);
        this.notificationService.showError(
          error?.message || 'Une erreur est survenue lors du changement de statut',
          'Erreur de modification'
        );
        this.onCancelStatusToggle();
      }
    });
  }

  onCancelStatusToggle(): void {
    this.showStatusConfirmation = false;
    this.userToToggleStatus = null;
  }

  onResetPassword(user: User): void {
    this.userToResetPassword = user;
    this.showPasswordResetConfirmation = true;
  }

  onConfirmPasswordReset(): void {
    if (!this.userToResetPassword) return;

    this.userService.resetPassword(this.userToResetPassword.id).subscribe({
      next: (result) => {
        this.notificationService.showSuccess(
          `Mot de passe réinitialisé avec succès!\nMot de passe temporaire: ${result.new_password}`,
          'Mot de passe réinitialisé'
        );
        this.onCancelPasswordReset();
      },
      error: (error) => {
        console.error('Erreur lors de la réinitialisation:', error);
        this.notificationService.showError(
          error?.message || 'Une erreur est survenue lors de la réinitialisation du mot de passe',
          'Erreur de réinitialisation'
        );
        this.onCancelPasswordReset();
      }
    });
  }

  onCancelPasswordReset(): void {
    this.showPasswordResetConfirmation = false;
    this.userToResetPassword = null;
  }


  getRoleLabel(role: string): string {
    const roles: { [key: string]: string } = {
      'user': 'Utilisateur',
      'consultant': 'Consultant',
      'admin': 'Administrateur',
      'super_admin': 'Super Admin'
    };
    return roles[role] || role;
  }

  getRoleBadgeClass(role: string): string {
    const classes: { [key: string]: string } = {
      'user': 'bg-blue-100 text-blue-800',
      'consultant': 'bg-yellow-100 text-yellow-800',
      'admin': 'bg-purple-100 text-purple-800',
      'super_admin': 'bg-red-100 text-red-800'
    };
    return classes[role] || 'bg-gray-100 text-gray-800';
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(field => {
      const control = formGroup.get(field);
      control?.markAsTouched({ onlySelf: true });
    });
  }

  getUserInitials(user: User): string {
    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    const firstInitial = firstName.charAt(0) || '';
    const lastInitial = lastName.charAt(0) || '';
    return (firstInitial + lastInitial).toUpperCase() || 'U';
  }

  getUserDisplayName(user: User): string {
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

  getFormTitle(): string {
    return this.isEditMode ? 'Modifier l\'utilisateur' : 'Créer un utilisateur';
  }

  getButtonText(): string {
    return this.isEditMode ? 'Modifier l\'utilisateur' : 'Créer un utilisateur';
  }

  getObjectKeys(obj: any): string[] {
    return Object.keys(obj || {});
  }

  // Modal message helpers

  getStatusToggleMessage(): string {
    if (!this.userToToggleStatus) return '';
    const userName = this.getUserDisplayName(this.userToToggleStatus);
    const action = this.userToToggleStatus.status === 'active' ? 'désactiver' : 'activer';
    return `Êtes-vous sûr de vouloir ${action} l'utilisateur ${userName} ?`;
  }

  getStatusToggleConfirmText(): string {
    if (!this.userToToggleStatus) return 'Confirmer';
    return this.userToToggleStatus.status === 'active' ? 'Désactiver' : 'Activer';
  }

  getPasswordResetMessage(): string {
    if (!this.userToResetPassword) return '';
    const userName = this.getUserDisplayName(this.userToResetPassword);
    return `Êtes-vous sûr de vouloir réinitialiser le mot de passe de l'utilisateur ${userName} ? Un nouveau mot de passe temporaire sera généré.`;
  }

  // Pagination methods
  onPageChange(page: number): void {
    if (page !== this.currentPage && page >= 1 && page <= (this.paginationInfo()?.last_page || 1)) {
      this.currentPage = page;
      this.loadUsers();
    }
  }

  onPerPageChange(perPage: number): void {
    if (perPage !== this.perPage) {
      this.perPage = perPage;
      this.currentPage = 1; // Reset to first page
      this.loadUsers();
    }
  }

  getPageNumbers(): number[] {
    const pagination = this.paginationInfo();
    if (!pagination) return [];

    const currentPage = pagination.current_page;
    const lastPage = pagination.last_page;
    const pages: number[] = [];

    // Show up to 5 page numbers around current page
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(lastPage, currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }
}