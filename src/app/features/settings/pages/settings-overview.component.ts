import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthFacade } from '../../auth/auth.facade';

interface SettingsMenuItem {
  id: string;
  title: string;
  route: string;
  icon: string;
  description: string;
  requiredRoles?: string[];
  badge?: string;
}

@Component({
  selector: 'app-settings-overview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-8">
      <!-- En-tête -->
      <div class="mb-8">
        <h2 class="text-2xl font-bold text-slate-800 mb-2">Paramètres du système</h2>
        <p class="text-slate-600">Gérer les paramètres et configurations du système</p>
      </div>

      <!-- Menu principal -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <!-- Mon profil -->
        <div class="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl border border-blue-200 p-6 cursor-pointer hover:shadow-lg transition-all"
             (click)="navigateTo('/settings/my-profile')">
          <div class="flex items-center space-x-4">
            <div class="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
              <i class="bi bi-person text-white text-xl"></i>
            </div>
            <div>
              <h3 class="font-semibold text-slate-800">Mon profil</h3>
              <p class="text-sm text-slate-600">Informations personnelles</p>
            </div>
          </div>
        </div>

        <!-- Mes permissions -->
        <div class="bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 p-6 cursor-pointer hover:shadow-lg transition-all"
             (click)="navigateTo('/settings/my-permissions')">
          <div class="flex items-center space-x-4">
            <div class="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
              <i class="bi bi-key text-white text-xl"></i>
            </div>
            <div>
              <h3 class="font-semibold text-slate-800">Mes permissions</h3>
              <p class="text-sm text-slate-600">Consulter mes accès</p>
            </div>
          </div>
        </div>

        <!-- Gestion des rôles (Admin) -->
        <div class="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200 p-6 cursor-pointer hover:shadow-lg transition-all"
             (click)="navigateTo('/settings/roles-management')">
          <div class="flex items-center space-x-4">
            <div class="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
              <i class="bi bi-shield-check text-white text-xl"></i>
            </div>
            <div>
              <h3 class="font-semibold text-slate-800">Gestion des rôles</h3>
              <p class="text-sm text-slate-600">Créer et modifier les rôles</p>
              <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 mt-1">
                Admin
              </span>
            </div>
          </div>
        </div>

        <!-- Gestion des permissions (Admin) -->
        <div class="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200 p-6 cursor-pointer hover:shadow-lg transition-all"
             (click)="navigateTo('/settings/permissions-management')">
          <div class="flex items-center space-x-4">
            <div class="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
              <i class="bi bi-key-fill text-white text-xl"></i>
            </div>
            <div>
              <h3 class="font-semibold text-slate-800">Gestion des permissions</h3>
              <p class="text-sm text-slate-600">Consulter les permissions système</p>
              <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 mt-1">
                Admin
              </span>
            </div>
          </div>
        </div>

        <!-- Attribution des rôles (Admin) -->
        <div class="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl border border-indigo-200 p-6 cursor-pointer hover:shadow-lg transition-all"
             (click)="navigateTo('/settings/users-roles')">
          <div class="flex items-center space-x-4">
            <div class="w-12 h-12 bg-indigo-500 rounded-lg flex items-center justify-center">
              <i class="bi bi-people text-white text-xl"></i>
            </div>
            <div>
              <h3 class="font-semibold text-slate-800">Attribution des rôles</h3>
              <p class="text-sm text-slate-600">Assigner des rôles aux utilisateurs</p>
              <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 mt-1">
                Admin
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  `
})
export class SettingsOverviewComponent implements OnInit {
  private router = inject(Router);
  private authFacade = inject(AuthFacade);

  ngOnInit(): void {
    // Component initialization
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }
}