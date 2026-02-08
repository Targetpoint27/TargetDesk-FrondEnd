import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService, User } from '../../../settings/user-management/user.service';
import { SimpleNotificationService } from '../../../../shared/services/simple-notification.service';
import { GetCurrentUserUseCase } from '../../../../domain/use-cases/auth/get-current-user.use-case';
import { AuthService } from '../../../../shared/services/auth.service';
import { AuthApiRepository } from '../../../../infrastructure/repositories/auth-api.repository';
import { UserEntity } from '../../../../domain/entities/user.entity';
import { PermissionService } from '../../../../core/auth/permission.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6">
      <div class="max-w-4xl mx-auto">
        <!-- En-tête -->
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-slate-800 mb-2">Mon Profil</h1>
          <p class="text-slate-600">Gérez vos informations personnelles et préférences</p>
        </div>

        @if (currentUser()) {
          <!-- Carte de présentation -->
          <div class="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg border border-white/60 p-8 mb-8">
            <div class="flex items-center space-x-6">
              <div class="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                {{ getUserInitials() }}
              </div>
              <div class="flex-1">
                <h2 class="text-2xl font-bold text-slate-800 mb-1">{{ getUserDisplayName() }}</h2>
                <p class="text-slate-600 mb-2">{{ currentUser()!.email }}</p>
                <div class="flex items-center space-x-4 text-sm text-slate-500">
                  <span class="flex items-center space-x-1">
                    <i class="bi bi-shield-check text-blue-500"></i>
                    @if (userRole$ | async; as role) {
                      <span>{{ role }}</span>
                    } @else {
                      <span>Utilisateur</span>
                    }
                  </span>
                  <span class="flex items-center space-x-1">
                    <i class="bi bi-circle-fill text-green-500"></i>
                    <span>{{ currentUser()!.status === 'active' ? 'Actif' : 'Inactif' }}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Informations personnelles -->
          <div class="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg border border-white/60 mb-8">
            <div class="border-b border-gray-200 px-8 py-6">
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="text-xl font-semibold text-slate-800">Informations personnelles</h3>
                  <p class="text-slate-600 mt-1">Modifiez vos données personnelles</p>
                </div>
                @if (!isEditingProfile()) {
                  <button
                    (click)="startEdit()"
                    class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
                    <i class="bi bi-pencil"></i>
                    <span>Modifier</span>
                  </button>
                }
              </div>
            </div>

            <div class="p-8">
              <form [formGroup]="profileForm" (ngSubmit)="onSaveProfile()">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <!-- Prénom -->
                  <div>
                    <label class="block text-sm font-medium text-slate-700 mb-2">Prénom *</label>
                    <input
                      type="text"
                      formControlName="first_name"
                      [readonly]="!isEditingProfile()"
                      class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white !text-slate-900 placeholder:text-gray-400"
                      [class.bg-gray-50]="!isEditingProfile()"
                    />
                    @if (profileForm.get('first_name')?.invalid && profileForm.get('first_name')?.touched) {
                      <p class="text-red-500 text-sm mt-1">Le prénom est requis</p>
                    }
                  </div>

                  <!-- Nom -->
                  <div>
                    <label class="block text-sm font-medium text-slate-700 mb-2">Nom *</label>
                    <input
                      type="text"
                      formControlName="last_name"
                      [readonly]="!isEditingProfile()"
                      class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white !text-slate-900 placeholder:text-gray-400"
                      [class.bg-gray-50]="!isEditingProfile()"
                    />
                    @if (profileForm.get('last_name')?.invalid && profileForm.get('last_name')?.touched) {
                      <p class="text-red-500 text-sm mt-1">Le nom est requis</p>
                    }
                  </div>

                  <!-- Email -->
                  <div>
                    <label class="block text-sm font-medium text-slate-700 mb-2">Email *</label>
                    <input
                      type="email"
                      formControlName="email"
                      [readonly]="!isEditingProfile()"
                      class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white !text-slate-900 placeholder:text-gray-400"
                      [class.bg-gray-50]="!isEditingProfile()"
                    />
                    @if (profileForm.get('email')?.invalid && profileForm.get('email')?.touched) {
                      <p class="text-red-500 text-sm mt-1">Un email valide est requis</p>
                    }
                  </div>

                  <!-- Téléphone -->
                  <div>
                    <label class="block text-sm font-medium text-slate-700 mb-2">Téléphone</label>
                    <input
                      type="tel"
                      formControlName="phone"
                      [readonly]="!isEditingProfile()"
                      class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white !text-slate-900 placeholder:text-gray-400"
                      [class.bg-gray-50]="!isEditingProfile()"
                      placeholder="Optionnel"
                    />
                  </div>

                  <!-- Département -->
                  <div class="md:col-span-2">
                    <label class="block text-sm font-medium text-slate-700 mb-2">Département</label>
                    <input
                      type="text"
                      formControlName="department"
                      [readonly]="!isEditingProfile()"
                      class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white !text-slate-900 placeholder:text-gray-400"
                      [class.bg-gray-50]="!isEditingProfile()"
                      placeholder="Optionnel"
                    />
                  </div>
                </div>

                @if (isEditingProfile()) {
                  <div class="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
                    <button
                      type="button"
                      (click)="cancelEdit()"
                      [disabled]="isLoading()"
                      class="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                      Annuler
                    </button>
                    <button
                      type="submit"
                      [disabled]="profileForm.invalid || isLoading()"
                      class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-2">
                      @if (isLoading()) {
                        <i class="bi bi-arrow-clockwise animate-spin"></i>
                        <span>Enregistrement...</span>
                      } @else {
                        <i class="bi bi-check"></i>
                        <span>Enregistrer</span>
                      }
                    </button>
                  </div>
                }
              </form>
            </div>
          </div>


        } @else {
          <div class="flex items-center justify-center py-12">
            <div class="text-center">
              <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p class="text-slate-600">Chargement du profil...</p>
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class ProfileComponent implements OnInit {
  private userService = inject(UserService);
  private notificationService = inject(SimpleNotificationService);
  private getCurrentUserUseCase = inject(GetCurrentUserUseCase);
  private authApiRepository = inject(AuthApiRepository);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private permissionService = inject(PermissionService);

  // State
  currentUser = signal<User | null>(null);
  isEditingProfile = signal(false);
  isLoading = signal(false);

  // Observable pour le rôle principal de l'utilisateur
  userRole$!: Observable<string>;

  // Forms
  profileForm: FormGroup;

  constructor() {
    this.profileForm = this.fb.group({
      first_name: ['', [Validators.required, Validators.minLength(2)]],
      last_name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      department: ['']
    });
  }

  ngOnInit(): void {
    this.loadCurrentUser();
    this.initializeUserRole();
  }

  private loadCurrentUser(): void {
    // Utiliser directement l'API /user qui retourne toutes les infos nécessaires
    this.authApiRepository.getCurrentUserComplete().subscribe({
      next: (userData) => {
        // Créer l'objet User directement depuis les données de l'API
        const user: User = {
          id: userData.id,
          name: userData.name,
          first_name: userData.first_name || '',
          last_name: userData.last_name || '',
          email: userData.email,
          phone: userData.phone || '',
          department: userData.department || '',
          status: (userData.status as 'active' | 'inactive') || 'active',
          last_login: userData.last_login || '',
          created_at: userData.created_at || new Date().toISOString(),
          updated_at: userData.updated_at || new Date().toISOString(),
          roles: userData.roles || []
        };

        this.currentUser.set(user);
        this.profileForm.patchValue({
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          phone: user.phone || '',
          department: user.department || ''
        });
      },
      error: () => {
        // Fallback vers le service d'auth mock
        this.loadUserFromAuthService();
      }
    });
  }

  private loadUserDetails(userId: number): void {
    this.userService.getUserById(userId).subscribe({
      next: (user) => {
        this.currentUser.set(user);
        this.profileForm.patchValue({
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          phone: user.phone || '',
          department: user.department || ''
        });
      },
      error: () => {
        // Fallback vers le service d'auth si l'utilisateur spécifique n'existe pas
        this.loadUserFromAuthService();
      }
    });
  }

  private loadUserFromAuthService(): void {
    // Utiliser l'ID depuis le service d'auth mock
    const currentUser = this.authService.getCurrentUser();
    if (currentUser && currentUser.id) {
      this.loadUserDetails(currentUser.id);
    } else {
      // Dernier fallback - ID 1 pour le développement
      this.loadUserDetails(1);
    }
  }

  startEdit(): void {
    this.isEditingProfile.set(true);
  }

  cancelEdit(): void {
    this.isEditingProfile.set(false);
    // Reset form to original values
    const user = this.currentUser();
    if (user) {
      this.profileForm.patchValue({
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone || '',
        department: user.department || ''
      });
    }
  }

  onSaveProfile(): void {
    if (this.profileForm.valid && this.currentUser()) {
      this.isLoading.set(true);

      const updateData = this.profileForm.value;

      this.userService.updateUser(this.currentUser()!.id, updateData).subscribe({
        next: (updatedUser) => {
          this.currentUser.set(updatedUser);
          this.isEditingProfile.set(false);
          this.isLoading.set(false);

          this.notificationService.showSuccess(
            'Profil mis à jour avec succès',
            'Profil modifié'
          );
        },
        error: (error) => {
          console.error('Error updating profile:', error);
          this.isLoading.set(false);
          this.notificationService.showError(
            'Erreur lors de la mise à jour du profil',
            'Erreur'
          );
        }
      });
    } else {
      this.markFormGroupTouched(this.profileForm);
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(field => {
      const control = formGroup.get(field);
      control?.markAsTouched({ onlySelf: true });
    });
  }

  // Template helpers
  getUserInitials(): string {
    const user = this.currentUser();
    if (!user) return 'U';

    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    const firstInitial = firstName.charAt(0) || '';
    const lastInitial = lastName.charAt(0) || '';

    return (firstInitial + lastInitial).toUpperCase() || 'U';
  }

  getUserDisplayName(): string {
    const user = this.currentUser();
    if (!user) return '';

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

  getUserRole(): string {
    const user = this.currentUser();
    if (!user || !user.roles || user.roles.length === 0) {
      return 'Utilisateur';
    }

    return user.roles[0].display_name || user.roles[0].name || 'Utilisateur';
  }

  private initializeUserRole(): void {
    // Initialize user role observable comme dans le layout
    this.userRole$ = this.permissionService.getUserPermissions().pipe(
      map(permissions => {
        if (!permissions?.roles?.length) {
          return 'Utilisateur';
        }

        // Get the first role's description or name
        const primaryRole = permissions.roles[0];
        return primaryRole.description || primaryRole.name || 'Utilisateur';
      })
    );
  }
}