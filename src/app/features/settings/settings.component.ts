import { Component, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthFacade } from '../auth/auth.facade';

interface SettingsSection {
  id: string;
  title: string;
  description: string;
  icon: string;
  requiredRoles?: string[];
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <!-- Header avec glassmorphism -->
      <div class="sticky top-0 z-10 backdrop-blur-xl bg-white/80 border-b border-white/20 shadow-lg shadow-black/5">
        <div class="max-w-7xl mx-auto px-6 py-6">
          <div class="flex items-center space-x-4">
            <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <i class="bi bi-gear text-white text-lg"></i>
            </div>
            <div>
              <h1 class="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Paramètres
              </h1>
              <p class="text-slate-600 text-sm mt-1">Configuration et administration système</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Contenu principal -->
      <div class="max-w-7xl mx-auto px-6 py-8">

        <!-- Section Admin/Super Admin -->
        <div *ngIf="isAdminUser()" class="mb-12">
          <div class="flex items-center space-x-3 mb-6">
            <div class="w-8 h-8 bg-gradient-to-br from-red-500 to-pink-600 rounded-lg flex items-center justify-center">
              <i class="bi bi-shield-exclamation text-white text-sm"></i>
            </div>
            <h2 class="text-2xl font-bold text-slate-800">Administration</h2>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ng-container *ngFor="let section of adminSections">
              <div class="group relative overflow-hidden bg-white/60 backdrop-blur-sm rounded-2xl border border-white/60 hover:bg-white/80 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1 cursor-pointer">
                <div class="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div class="relative p-6">
                  <div class="flex items-start space-x-4">
                    <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <i [class]="'bi bi-' + section.icon + ' text-white text-lg'"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                      <h3 class="text-lg font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                        {{ section.title }}
                      </h3>
                      <p class="text-sm text-slate-600 mt-1 leading-relaxed">
                        {{ section.description }}
                      </p>
                    </div>
                  </div>
                  <div class="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
                </div>
              </div>
            </ng-container>
          </div>
        </div>

        <!-- Section Manager -->
        <div *ngIf="isManagerUser()" class="mb-12">
          <div class="flex items-center space-x-3 mb-6">
            <div class="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
              <i class="bi bi-people text-white text-sm"></i>
            </div>
            <h2 class="text-2xl font-bold text-slate-800">Gestion d'équipe</h2>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ng-container *ngFor="let section of managerSections">
              <div class="group relative overflow-hidden bg-white/60 backdrop-blur-sm rounded-2xl border border-white/60 hover:bg-white/80 transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/10 hover:-translate-y-1 cursor-pointer">
                <div class="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div class="relative p-6">
                  <div class="flex items-start space-x-4">
                    <div class="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <i [class]="'bi bi-' + section.icon + ' text-white text-lg'"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                      <h3 class="text-lg font-semibold text-slate-800 group-hover:text-amber-600 transition-colors">
                        {{ section.title }}
                      </h3>
                      <p class="text-sm text-slate-600 mt-1 leading-relaxed">
                        {{ section.description }}
                      </p>
                    </div>
                  </div>
                  <div class="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
                </div>
              </div>
            </ng-container>
          </div>
        </div>

        <!-- Section Compte Personnel (pour tous) -->
        <div class="mb-8">
          <div class="flex items-center space-x-3 mb-6">
            <div class="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
              <i class="bi bi-person-circle text-white text-sm"></i>
            </div>
            <h2 class="text-2xl font-bold text-slate-800">Mon compte</h2>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ng-container *ngFor="let section of personalSections">
              <div class="group relative overflow-hidden bg-white/60 backdrop-blur-sm rounded-2xl border border-white/60 hover:bg-white/80 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-1 cursor-pointer">
                <div class="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div class="relative p-6">
                  <div class="flex items-start space-x-4">
                    <div class="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <i [class]="'bi bi-' + section.icon + ' text-white text-lg'"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                      <h3 class="text-lg font-semibold text-slate-800 group-hover:text-emerald-600 transition-colors">
                        {{ section.title }}
                      </h3>
                      <p class="text-sm text-slate-600 mt-1 leading-relaxed">
                        {{ section.description }}
                      </p>
                      <div *ngIf="section.id === 'my-roles'" class="mt-3">
                        <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                          {{ currentUserRole() }}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div class="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
                </div>
              </div>
            </ng-container>
          </div>
        </div>

        <!-- Message pour consultant -->
        <div *ngIf="isConsultantUser()" class="mt-8">
          <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/60 rounded-2xl p-6">
            <div class="flex items-center space-x-3">
              <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <i class="bi bi-info-circle text-blue-600"></i>
              </div>
              <div>
                <h3 class="font-medium text-blue-900">Accès en lecture seule</h3>
                <p class="text-sm text-blue-700 mt-1">Vous pouvez consulter vos informations mais ne pouvez pas les modifier.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class SettingsComponent implements OnInit {
  private authFacade = inject(AuthFacade);

  currentUser$ = this.authFacade.user$;
  currentUserRole = computed(() => {
    const user = this.authFacade.getCurrentUser();
    // Note: UserEntity doesn't have roles property, using fallback
    return 'Utilisateur';
  });

  adminSections: SettingsSection[] = [
    {
      id: 'roles-permissions',
      title: 'Rôles & Permissions',
      description: 'Gestion complète des rôles et permissions granulaires par module',
      icon: 'shield-check',
      requiredRoles: ['super_admin', 'admin']
    },
    {
      id: 'visibility-rules',
      title: 'Règles de visibilité',
      description: 'Configuration des règles d\'accès par équipe, région et territoire',
      icon: 'eye-slash',
      requiredRoles: ['super_admin', 'admin']
    },
    {
      id: 'users-management',
      title: 'Gestion des utilisateurs',
      description: 'Création, édition et attribution de rôles aux utilisateurs',
      icon: 'people',
      requiredRoles: ['super_admin', 'admin']
    },
    {
      id: 'teams-management',
      title: 'Gestion des équipes',
      description: 'Organisation des équipes et assignation des membres',
      icon: 'diagram-3',
      requiredRoles: ['super_admin', 'admin']
    },
    {
      id: 'audit-logs',
      title: 'Audit & Logs',
      description: 'Journalisation des actions et historique des changements',
      icon: 'clock-history',
      requiredRoles: ['super_admin', 'admin']
    },
    {
      id: 'system-config',
      title: 'Configuration système',
      description: 'Paramètres globaux et configuration avancée',
      icon: 'gear',
      requiredRoles: ['super_admin']
    }
  ];

  managerSections: SettingsSection[] = [
    {
      id: 'team-members',
      title: 'Membres de l\'équipe',
      description: 'Vue et gestion des membres de votre équipe',
      icon: 'people',
      requiredRoles: ['manager']
    },
    {
      id: 'client-assignment',
      title: 'Réassignation clients',
      description: 'Réassigner des clients au sein de votre équipe',
      icon: 'arrow-left-right',
      requiredRoles: ['manager']
    },
    {
      id: 'team-view',
      title: 'Vue équipe',
      description: 'Activation temporaire de la vue équipe étendue',
      icon: 'eye',
      requiredRoles: ['manager']
    },
    {
      id: 'team-reports',
      title: 'Rapports équipe',
      description: 'Statistiques et rapports de performance de l\'équipe',
      icon: 'bar-chart',
      requiredRoles: ['manager']
    }
  ];

  personalSections: SettingsSection[] = [
    {
      id: 'my-roles',
      title: 'Mes rôles',
      description: 'Consultation de vos rôles et privilèges actuels',
      icon: 'person-badge'
    },
    {
      id: 'my-permissions',
      title: 'Mes permissions',
      description: 'Détail de vos permissions par module',
      icon: 'key'
    },
    {
      id: 'my-team',
      title: 'Mon équipe',
      description: 'Informations sur votre équipe et vos collègues',
      icon: 'people'
    },
    {
      id: 'my-clients',
      title: 'Mes clients assignés',
      description: 'Liste de vos clients assignés et demandes de transfert',
      icon: 'briefcase'
    }
  ];

  ngOnInit(): void {}

  isAdminUser(): boolean {
    // Note: UserEntity doesn't have roles property yet, using fallback
    // TODO: Implement role checking when UserEntity is extended with roles
    return false;
  }

  isManagerUser(): boolean {
    // Note: UserEntity doesn't have roles property yet, using fallback
    // TODO: Implement role checking when UserEntity is extended with roles
    return false;
  }

  isConsultantUser(): boolean {
    // Note: UserEntity doesn't have roles property yet, using fallback
    // TODO: Implement role checking when UserEntity is extended with roles
    return false;
  }
}