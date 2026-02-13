// ========================================
// COMPOSANT CARTE PROJET
// Affichage synthétique d'un projet dans les listes
// ========================================

import { Component, Input, Output, EventEmitter, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import {
  Project,
  ProjectStatus,
  ProjectRiskIndicator,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
  RISK_LEVEL_LABELS,
  RISK_LEVEL_COLORS,
  getProgressConfig,
  getDaysRemaining,
  isProjectOverdue,
  formatProjectDate
} from '../../models/project.models';

@Component({
  selector: 'app-project-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="project-card group relative bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
      <!-- En-tête avec statut et menu -->
      <div class="flex items-start justify-between p-4 pb-2">
        <div class="flex items-center space-x-3">
          <!-- Badge de statut -->
          <span
            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
            [ngClass]="statusBadgeClass()"
          >
            <svg class="w-2 h-2 mr-1.5" fill="currentColor" viewBox="0 0 8 8">
              <circle cx="4" cy="4" r="3"/>
            </svg>
            {{ statusLabel() }}
          </span>

          <!-- Badge de risque si élevé -->
          @if (project.risk_indicator === 'high') {
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"/>
              </svg>
              Risque élevé
            </span>
          }
        </div>

        <!-- Menu d'actions -->
        <div class="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          @if (canEdit) {
            <button
              (click)="onEdit.emit(project)"
              class="p-1 text-gray-400 hover:text-blue-600 rounded-full hover:bg-blue-50 transition-colors"
              title="Modifier"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
            </button>
          }

          <button
            (click)="onDuplicate.emit(project)"
            class="p-1 text-gray-400 hover:text-green-600 rounded-full hover:bg-green-50 transition-colors"
            title="Dupliquer"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
            </svg>
          </button>

          <div class="relative">
            <button
              (click)="toggleMenu()"
              class="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-50 transition-colors"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
              </svg>
            </button>

            @if (showMenu()) {
              <div class="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                <button
                  (click)="onViewDetails.emit(project); toggleMenu()"
                  class="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                  </svg>
                  Voir les détails
                </button>
                <button
                  (click)="onManageTeam.emit(project); toggleMenu()"
                  class="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"/>
                  </svg>
                  Gérer l'équipe
                </button>
                @if (canDelete) {
                  <hr class="my-1 border-gray-200">
                  <button
                    (click)="onDelete.emit(project); toggleMenu()"
                    class="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                    Supprimer
                  </button>
                }
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Corps de la carte -->
      <div class="px-4 pb-4">
        <!-- Titre et code du projet -->
        <div class="mb-3">
          <h3 class="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
            <a [routerLink]="['/dashboard/projects/detail', project.id]" class="hover:underline">
              {{ project.name }}
            </a>
          </h3>
          <p class="text-sm text-gray-500 mt-1">
            <span class="font-mono">{{ project.code }}</span>
            @if (project.department) {
              • {{ project.department }}
            }
          </p>
        </div>

        <!-- Description -->
        @if (project.description) {
          <p class="text-sm text-gray-600 mb-3 line-clamp-2">{{ project.description }}</p>
        }

        <!-- Progression -->
        <div class="mb-4">
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs font-medium text-gray-700">Progression</span>
            <span class="text-xs font-medium" [ngClass]="progressConfig().color === 'success' ? 'text-green-600' : progressConfig().color === 'warning' ? 'text-orange-600' : 'text-red-600'">
              {{ project.progress_percentage }}%
            </span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div
              class="h-2 rounded-full transition-all duration-300"
              [ngClass]="{
                'bg-green-500': progressConfig().color === 'success',
                'bg-orange-500': progressConfig().color === 'warning',
                'bg-red-500': progressConfig().color === 'danger'
              }"
              [style.width.%]="project.progress_percentage"
            ></div>
          </div>
        </div>

        <!-- Dates et échéances -->
        <div class="flex items-center justify-between text-xs text-gray-500 mb-3">
          <div class="flex items-center">
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            Début: {{ formatDate(project.start_date) }}
          </div>
          <div class="flex items-center" [ngClass]="{ 'text-red-600 font-medium': isOverdue() }">
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            Fin: {{ formatDate(project.planned_end_date) }}
            @if (daysRemaining() !== null && daysRemaining()! > 0) {
              <span class="ml-1">({{ daysRemaining() }}j)</span>
            }
            @if (isOverdue()) {
              <span class="ml-1 font-medium">En retard!</span>
            }
          </div>
        </div>

        <!-- Chef de projet et équipe -->
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            @if (project.project_manager) {
              <div class="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mr-2">
                <span class="text-xs font-medium text-white">
                  {{ project.project_manager.name ? project.project_manager.name.substring(0, 2).toUpperCase() : 'NA' }}
                </span>
              </div>
              <span class="text-xs text-gray-600">{{ project.project_manager.name || 'N/A' }}</span>
            }
          </div>

          @if (project.team_members && project.team_members.length > 0) {
            <div class="flex items-center">
              <svg class="w-3 h-3 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"/>
              </svg>
              <span class="text-xs text-gray-500">{{ project.team_members.length }} membre{{ project.team_members.length > 1 ? 's' : '' }}</span>
            </div>
          }
        </div>

        <!-- Client -->
        @if (project.client_info || project.external_client_info) {
          <div class="mt-2 pt-2 border-t border-gray-100">
            <div class="flex items-center">
              <svg class="w-3 h-3 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
              </svg>
              <span class="text-xs text-gray-600">
                @if (project.client_type === 'externe' && project.external_client_info) {
                  {{ project.external_client_info.name }}
                  @if (project.external_client_info.company) {
                    ({{ project.external_client_info.company }})
                  }
                } @else if (project.client) {
                  {{ project.client.name }}
                }
              </span>
            </div>
          </div>
        }

        <!-- Budget -->
        @if (project.estimated_budget) {
          <div class="mt-2 pt-2 border-t border-gray-100">
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-500">Budget estimé</span>
              <span class="text-xs font-medium text-gray-900">{{ formatCurrency(project.estimated_budget) }} €</span>
            </div>
          </div>
        }
      </div>

      <!-- Indicateur de retard -->
      @if (isOverdue()) {
        <div class="absolute top-0 right-0 w-0 h-0 border-l-[20px] border-l-transparent border-t-[20px] border-t-red-500">
          <div class="absolute -top-4 -right-1 transform rotate-45">
            <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
            </svg>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .project-card {
      transition: all 0.2s ease-in-out;
    }

    .project-card:hover {
      transform: translateY(-2px);
    }
  `]
})
export class ProjectCardComponent {
  @Input({ required: true }) project!: Project;
  @Input() canEdit = false;
  @Input() canDelete = false;

  @Output() onEdit = new EventEmitter<Project>();
  @Output() onDelete = new EventEmitter<Project>();
  @Output() onDuplicate = new EventEmitter<Project>();
  @Output() onViewDetails = new EventEmitter<Project>();
  @Output() onManageTeam = new EventEmitter<Project>();

  showMenu = signal(false);

  // Computed properties pour optimiser les performances
  statusLabel = computed(() => PROJECT_STATUS_LABELS[this.project.status] || 'Inconnu');

  statusBadgeClass = computed(() => {
    const color = PROJECT_STATUS_COLORS[this.project.status];
    return {
      'bg-green-100 text-green-800': color === 'success',
      'bg-orange-100 text-orange-800': color === 'warning',
      'bg-red-100 text-red-800': color === 'danger',
      'bg-blue-100 text-blue-800': color === 'info',
      'bg-gray-100 text-gray-800': color === 'secondary'
    };
  });

  progressConfig = computed(() => getProgressConfig(this.project.progress_percentage));

  daysRemaining = computed(() => {
    const days = getDaysRemaining(this.project.planned_end_date);
    return days > 0 ? days : null;
  });

  isOverdue = computed(() => isProjectOverdue(this.project));

  toggleMenu(): void {
    this.showMenu.update(show => !show);
  }

  formatDate(dateString: string): string {
    return formatProjectDate(dateString);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }

}