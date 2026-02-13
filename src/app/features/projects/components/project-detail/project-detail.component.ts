import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { Subject, takeUntil, switchMap, catchError, of, finalize, map } from 'rxjs';

import { ProjectsApiService } from '../../services/projects-api.service';
import {
  Project,
  ProjectStatus,
  ProjectTeamMember,
  PROJECT_STATUS_LABELS,
  ProjectStats
} from '../../models/project.models';
import { UserEntity } from '../../../../domain/entities/user.entity';
import { ClientEntity } from '../../../../domain/entities/client.entity';
import { UserService } from '../../../settings/user-management/user.service';


@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <!-- Header avec navigation -->
      <div class="bg-white shadow-sm border-b border-gray-200">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-20">
            <div class="flex items-center space-x-4">
              <button
                (click)="goBack()"
                class="flex items-center text-gray-600 hover:text-blue-600 transition-colors"
              >
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
                Retour à la liste
              </button>
              <div class="h-6 w-px bg-gray-300"></div>
              <div>
                <h1 class="text-2xl font-bold text-gray-900">
                  @if (project(); as proj) {
                    {{ proj.name }}
                  } @else {
                    Détails du projet
                  }
                </h1>
                @if (project(); as proj) {
                  <p class="text-sm text-gray-500 mt-1">{{ proj.code }} • {{ proj.department }}</p>
                }
              </div>
            </div>

            <div class="flex items-center space-x-3">
              @if (project(); as proj) {
                <span
                  class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                  [ngClass]="getStatusClasses(proj.status)"
                >
                  <div class="w-2 h-2 rounded-full mr-2" [ngClass]="getStatusDotClasses(proj.status)"></div>
                  {{ getStatusLabel(proj.status) }}
                </span>

                <!-- Progress Badge -->
                <div class="flex items-center bg-gray-100 rounded-full px-3 py-1">
                  <div class="w-3 h-3 bg-gray-300 rounded-full mr-2 relative overflow-hidden">
                    <div
                      class="absolute top-0 left-0 h-full bg-blue-500 transition-all duration-300"
                      [style.width.%]="proj.progress_percentage"
                    ></div>
                  </div>
                  <span class="text-xs font-medium text-gray-700">{{ proj.progress_percentage }}%</span>
                </div>

                <!-- Actions -->
                <div class="flex items-center space-x-2">
                  <button
                    (click)="toggleFavorite()"
                    class="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <svg class="w-5 h-5" [class.text-red-500]="isFavorite()" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd"/>
                    </svg>
                  </button>

                  <button
                    (click)="shareProject()"
                    class="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"/>
                    </svg>
                  </button>

                  <!-- Dropdown Actions -->
                  <div class="relative" [class.z-50]="showDropdown()">
                    <button
                      (click)="toggleDropdown()"
                      class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                      Actions
                      <svg class="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                      </svg>
                    </button>

                    @if (showDropdown()) {
                      <div class="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg">
                        <div class="py-1">
                          <button
                            (click)="editProject()"
                            class="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                            Modifier le projet
                          </button>
                          <button
                            (click)="duplicateProject()"
                            class="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                            </svg>
                            Dupliquer
                          </button>
                          <button
                            (click)="exportProject()"
                            class="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                            </svg>
                            Exporter
                          </button>
                          <div class="border-t border-gray-100 my-1"></div>
                          <button
                            (click)="archiveProject()"
                            class="flex items-center w-full px-4 py-2 text-sm text-orange-700 hover:bg-orange-50"
                          >
                            <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8l7-7 7 7M5 8l-2 9h16l-2-9M5 8l7 7 7-7"/>
                            </svg>
                            Archiver
                          </button>
                          <button
                            (click)="deleteProject()"
                            class="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                          >
                            <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                            </svg>
                            Supprimer
                          </button>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      </div>

      @if (loading()) {
        <!-- Loading State -->
        <div class="flex items-center justify-center min-h-96">
          <div class="flex flex-col items-center space-y-4">
            <div class="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            <span class="text-gray-600 font-medium">Chargement du projet...</span>
          </div>
        </div>
      } @else if (error()) {
        <!-- Error State -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div class="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
            <div class="flex justify-center mb-4">
              <svg class="h-12 w-12 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
              </svg>
            </div>
            <h3 class="text-lg font-medium text-red-800 mb-2">Erreur de chargement</h3>
            <p class="text-red-700 mb-4">{{ error() }}</p>
            <button
              (click)="loadProject()"
              class="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              Réessayer
            </button>
          </div>
        </div>
      } @else if (project(); as proj) {
        <!-- Contenu principal -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          <!-- Onglets de navigation -->
          <div class="mb-8">
            <nav class="flex space-x-8 bg-white rounded-xl p-2 shadow-sm border border-gray-200">
              @for (tab of tabs; track tab.id) {
                <button
                  (click)="setActiveTab(tab.id)"
                  class="flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                  [class.bg-blue-100]="activeTab() === tab.id"
                  [class.text-blue-700]="activeTab() === tab.id"
                  [class.text-gray-600]="activeTab() !== tab.id"
                  [class.hover:text-blue-600]="activeTab() !== tab.id"
                >
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" [attr.d]="tab.icon"/>
                  </svg>
                  {{ tab.label }}
                  @if (tab.badge) {
                    <span class="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {{ tab.badge }}
                    </span>
                  }
                </button>
              }
            </nav>
          </div>

          <!-- Contenu des onglets -->
          <div class="w-full">

            <!-- Contenu principal -->
            <div class="space-y-8">

              @if (activeTab() === 'overview') {
                <!-- Vue d'ensemble complète en grille -->
                <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">

                  <!-- Informations générales -->
                  <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Informations générales</h3>
                    <dl class="space-y-4">
                      <div>
                        <dt class="text-sm font-medium text-gray-500">Code projet</dt>
                        <dd class="mt-1 text-sm text-gray-900 font-mono">{{ proj.code }}</dd>
                      </div>

                      <div>
                        <dt class="text-sm font-medium text-gray-500">Nom du projet</dt>
                        <dd class="mt-1 text-sm text-gray-900 font-medium">{{ proj.name }}</dd>
                      </div>

                      @if (proj.description) {
                        <div>
                          <dt class="text-sm font-medium text-gray-500">Description</dt>
                          <dd class="mt-1 text-sm text-gray-900">{{ proj.description }}</dd>
                        </div>
                      }

                      @if (proj.objectives) {
                        <div>
                          <dt class="text-sm font-medium text-gray-500">Objectifs</dt>
                          <dd class="mt-1 text-sm text-gray-900">{{ proj.objectives }}</dd>
                        </div>
                      }

                      <div>
                        <dt class="text-sm font-medium text-gray-500">Statut</dt>
                        <dd class="mt-1">
                          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                                [ngClass]="getStatusClasses(proj.status)">
                            <div class="w-1.5 h-1.5 rounded-full mr-1.5" [ngClass]="getStatusDotClasses(proj.status)"></div>
                            {{ getStatusLabel(proj.status) }}
                          </span>
                        </dd>
                      </div>

                      <div>
                        <dt class="text-sm font-medium text-gray-500">Progression</dt>
                        <dd class="mt-1">
                          <div class="flex items-center">
                            <div class="flex-1 bg-gray-200 rounded-full h-2 mr-3">
                              <div class="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                   [style.width.%]="proj.progress_percentage"></div>
                            </div>
                            <span class="text-sm font-medium text-gray-700">{{ proj.progress_percentage }}%</span>
                          </div>
                        </dd>
                      </div>

                      <div>
                        <dt class="text-sm font-medium text-gray-500">Département</dt>
                        <dd class="mt-1 text-sm text-gray-900">{{ proj.department }}</dd>
                      </div>

                      @if (proj.risk_indicator) {
                        <div>
                          <dt class="text-sm font-medium text-gray-500">Niveau de risque</dt>
                          <dd class="mt-1">
                            <span
                              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                              [class.bg-green-100]="proj.risk_indicator === 'low'"
                              [class.text-green-800]="proj.risk_indicator === 'low'"
                              [class.bg-yellow-100]="proj.risk_indicator === 'medium'"
                              [class.text-yellow-800]="proj.risk_indicator === 'medium'"
                              [class.bg-red-100]="proj.risk_indicator === 'high'"
                              [class.text-red-800]="proj.risk_indicator === 'high'"
                            >
                              {{ getRiskLabel(proj.risk_indicator) }}
                            </span>
                          </dd>
                        </div>
                      }
                    </dl>
                  </div>

                  <!-- Gestion et responsabilités -->
                  <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Gestion et responsabilités</h3>
                    <dl class="space-y-4">
                      @if (proj.project_manager) {
                        <div>
                          <dt class="text-sm font-medium text-gray-500">Chef de projet</dt>
                          <dd class="mt-1">
                            <div class="flex items-center space-x-2">
                              <div class="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                <span class="text-xs font-medium text-white">
                                  {{ proj.project_manager.name ? proj.project_manager.name.substring(0, 2).toUpperCase() : 'NA' }}
                                </span>
                              </div>
                              <div>
                                <p class="text-sm text-gray-900">{{ proj.project_manager.name || 'Non assigné' }}</p>
                                <p class="text-xs text-gray-500">{{ proj.project_manager.email }}</p>
                              </div>
                            </div>
                          </dd>
                        </div>
                      }

                      @if (proj.created_by) {
                        <div>
                          <dt class="text-sm font-medium text-gray-500">Créé par</dt>
                          <dd class="mt-1 text-sm text-gray-900">ID: {{ proj.created_by }}</dd>
                        </div>
                      }

                      @if (proj.updated_by) {
                        <div>
                          <dt class="text-sm font-medium text-gray-500">Dernière modification par</dt>
                          <dd class="mt-1 text-sm text-gray-900">ID: {{ proj.updated_by }}</dd>
                        </div>
                      }

                      @if (proj.created_at) {
                        <div>
                          <dt class="text-sm font-medium text-gray-500">Créé le</dt>
                          <dd class="mt-1 text-sm text-gray-900">{{ formatDate(proj.created_at) }}</dd>
                        </div>
                      }

                      @if (proj.updated_at) {
                        <div>
                          <dt class="text-sm font-medium text-gray-500">Dernière modification</dt>
                          <dd class="mt-1 text-sm text-gray-500">{{ formatDate(proj.updated_at) }}</dd>
                        </div>
                      }
                    </dl>
                  </div>

                  <!-- Informations client -->
                  <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Informations client</h3>
                    <dl class="space-y-4">
                      <div>
                        <dt class="text-sm font-medium text-gray-500">Type de client</dt>
                        <dd class="mt-1">
                          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                                [class.bg-blue-100]="proj.client_type === 'interne'"
                                [class.text-blue-800]="proj.client_type === 'interne'"
                                [class.bg-green-100]="proj.client_type === 'externe'"
                                [class.text-green-800]="proj.client_type === 'externe'">
                            {{ proj.client_type === 'interne' ? 'Client interne' : 'Client externe' }}
                          </span>
                        </dd>
                      </div>

                      @if (proj.client) {
                        <div>
                          <dt class="text-sm font-medium text-gray-500">Client</dt>
                          <dd class="mt-1 text-sm text-gray-900">{{ proj.client.name || 'Non spécifié' }}</dd>
                        </div>
                      }

                      @if (proj.external_client_info) {
                        <div>
                          <dt class="text-sm font-medium text-gray-500">Client externe</dt>
                          <dd class="mt-1 space-y-1">
                            @if (proj.external_client_info.name) {
                              <p class="text-sm text-gray-900 font-medium">{{ proj.external_client_info.name }}</p>
                            }
                            @if (proj.external_client_info.company) {
                              <p class="text-sm text-gray-600">🏢 {{ proj.external_client_info.company }}</p>
                            }
                            @if (proj.external_client_info.email) {
                              <p class="text-sm text-gray-600">📧 {{ proj.external_client_info.email }}</p>
                            }
                          </dd>
                        </div>
                      }
                    </dl>
                  </div>

                  <!-- Budget -->
                  <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Budget</h3>
                    <dl class="space-y-4">
                      @if (proj.estimated_budget) {
                        <div>
                          <dt class="text-sm font-medium text-gray-500">Budget estimé</dt>
                          <dd class="mt-1">
                            <span class="text-lg font-semibold text-gray-900">{{ proj.estimated_budget | currency:'EUR':'symbol':'1.2-2' }}</span>
                          </dd>
                        </div>
                      }

                      @if (proj.actual_budget) {
                        <div>
                          <dt class="text-sm font-medium text-gray-500">Budget réel</dt>
                          <dd class="mt-1">
                            <span class="text-lg font-semibold"
                                  [class.text-red-600]="isBudgetOverrun(proj.actual_budget, proj.estimated_budget)"
                                  [class.text-green-600]="!isBudgetOverrun(proj.actual_budget, proj.estimated_budget)">
                              {{ proj.actual_budget | currency:'EUR':'symbol':'1.2-2' }}
                            </span>
                          </dd>
                        </div>
                      }

                      @if (proj.estimated_budget && proj.actual_budget) {
                        <div>
                          <dt class="text-sm font-medium text-gray-500">Budget restant</dt>
                          <dd class="mt-1">
                            <span class="text-sm font-medium"
                                  [class.text-red-600]="+(proj.actual_budget || 0) > +(proj.estimated_budget || 0)"
                                  [class.text-green-600]="+(proj.actual_budget || 0) <= +(proj.estimated_budget || 0)">
                              {{ (+(proj.estimated_budget || 0) - +(proj.actual_budget || 0)) | currency:'EUR':'symbol':'1.2-2' }}
                            </span>
                          </dd>
                        </div>
                      }
                    </dl>
                  </div>

                  <!-- Timeline -->
                  <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
                    <dl class="space-y-4">
                      @if (proj.start_date) {
                        <div>
                          <dt class="text-sm font-medium text-gray-500">Date de début</dt>
                          <dd class="mt-1 text-sm text-gray-900">{{ formatDate(proj.start_date) }}</dd>
                        </div>
                      }

                      @if (proj.planned_end_date) {
                        <div>
                          <dt class="text-sm font-medium text-gray-500">Fin prévue</dt>
                          <dd class="mt-1 text-sm text-gray-900">{{ formatDate(proj.planned_end_date) }}</dd>
                        </div>
                      }

                      @if (proj.actual_end_date) {
                        <div>
                          <dt class="text-sm font-medium text-gray-500">Fin réelle</dt>
                          <dd class="mt-1 text-sm text-gray-900">{{ formatDate(proj.actual_end_date) }}</dd>
                        </div>
                      }

                      @if (proj.status !== 'termine' && proj.planned_end_date) {
                        <div>
                          <dt class="text-sm font-medium text-gray-500">Temps restant</dt>
                          <dd class="mt-1">
                            <span class="text-sm font-medium"
                                  [class.text-red-600]="getDaysRemaining(proj.planned_end_date) < 0"
                                  [class.text-green-600]="getDaysRemaining(proj.planned_end_date) > 30"
                                  [class.text-orange-600]="getDaysRemaining(proj.planned_end_date) >= 0 && getDaysRemaining(proj.planned_end_date) <= 30">
                              {{ getDaysRemaining(proj.planned_end_date) }} jours
                            </span>
                          </dd>
                        </div>
                      }
                    </dl>
                  </div>

                  <!-- Équipe projet -->
                  @if (proj.team_members && proj.team_members.length > 0) {
                    <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                      <h3 class="text-lg font-semibold text-gray-900 mb-4">Équipe projet</h3>
                      <div class="space-y-3">
                        @for (member of proj.team_members.slice(0, 3); track member.id) {
                          <div class="flex items-center space-x-3">
                            <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                              <span class="text-xs font-medium text-white">
                                {{ (member.user?.name?.substring(0, 2)?.toUpperCase()) || 'NA' }}
                              </span>
                            </div>
                            <div class="flex-1 min-w-0">
                              <p class="text-sm font-medium text-gray-900 truncate">{{ member.user.name }}</p>
                              <p class="text-xs text-gray-500 capitalize">{{ member.role }}</p>
                            </div>
                            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                                  [class.bg-green-100]="member.is_active"
                                  [class.text-green-800]="member.is_active"
                                  [class.bg-red-100]="!member.is_active"
                                  [class.text-red-800]="!member.is_active">
                              {{ member.is_active ? 'Actif' : 'Inactif' }}
                            </span>
                          </div>
                        }
                        @if (proj.team_members.length > 3) {
                          <div class="text-xs text-gray-500 text-center pt-2">
                            et {{ proj.team_members.length - 3 }} autre(s) membre(s)
                          </div>
                        }
                      </div>
                    </div>
                  }

                  <!-- Historique des modifications -->
                  @if (proj.histories && proj.histories.length > 0) {
                    <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 xl:col-span-2">
                      <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold text-gray-900">Historique des modifications</h3>
                        <span class="text-sm text-gray-500">{{ proj.histories.length }} modifications</span>
                      </div>
                      <div class="space-y-3 max-h-64 overflow-y-auto">
                        @for (history of proj.histories.slice(0, 5); track history.id) {
                          <div class="flex items-start space-x-3 pb-3 border-b border-gray-100 last:border-b-0 last:pb-0">
                            <div class="flex-shrink-0 mt-0.5 w-2 h-2 bg-blue-500 rounded-full"></div>
                            <div class="flex-1 min-w-0">
                              <p class="text-sm text-gray-900">{{ history.action_type || 'Modification' }}</p>
                              <p class="text-xs text-gray-500">{{ formatDate(history.created_at) }}</p>
                            </div>
                          </div>
                        }
                        @if (proj.histories.length > 5) {
                          <div class="text-xs text-gray-500 text-center pt-2">
                            et {{ proj.histories.length - 5 }} autre(s) modification(s)
                          </div>
                        }
                      </div>
                    </div>
                  }

                </div>

              } @else if (activeTab() === 'team') {
                <!-- Gestion d'équipe -->
                <div class="space-y-6">

                  <!-- Header équipe -->
                  <div class="flex items-center justify-between">
                    <h3 class="text-lg font-semibold text-gray-900">Équipe du projet</h3>
                    <button
                      (click)="addTeamMember()"
                      class="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0 0h6m-6 0H6"/>
                      </svg>
                      Ajouter un membre
                    </button>
                  </div>

                  <!-- Liste des membres -->
                  @if (proj.team_members && proj.team_members.length > 0) {
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      @for (member of proj.team_members; track member.id) {
                        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                          <div class="flex items-center justify-between">
                            <div class="flex items-center">
                              <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                                <span class="text-sm font-medium text-white">
                                  {{ (member.user?.name?.substring(0, 2)?.toUpperCase()) || 'XX' }}
                                </span>
                              </div>
                              <div class="ml-4">
                                <h4 class="text-sm font-semibold text-gray-900">
                                  {{ member.user.name || 'Utilisateur inconnu' }}
                                </h4>
                                <p class="text-sm text-gray-600">{{ member.role }}</p>
                              </div>
                            </div>
                            <div class="flex items-center space-x-2">
                              @if (member.hourly_rate) {
                                <span class="text-xs text-gray-500">{{ formatCurrency(member.hourly_rate) }}/h</span>
                              }
                              <button
                                (click)="editTeamMember(member)"
                                class="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                              >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                </svg>
                              </button>
                              <button
                                (click)="removeTeamMember(member)"
                                class="p-1 text-gray-400 hover:text-red-600 transition-colors"
                              >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                </svg>
                              </button>
                            </div>
                          </div>

                          <div class="mt-4 flex items-center space-x-4 text-xs text-gray-500">
                            <span>Ajouté le {{ formatDate(member.joined_at) }}</span>
                            @if (member.is_active) {
                              <span class="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                                Actif
                              </span>
                            } @else {
                              <span class="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-800">
                                Inactif
                              </span>
                            }
                          </div>
                        </div>
                      }
                    </div>
                  } @else {
                    <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                      <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                      </svg>
                      <h3 class="mt-2 text-sm font-medium text-gray-900">Aucun membre d'équipe</h3>
                      <p class="mt-1 text-sm text-gray-500">Commencez par ajouter des membres à votre équipe projet.</p>
                      <button
                        (click)="addTeamMember()"
                        class="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                      >
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0 0h6m-6 0H6"/>
                        </svg>
                        Ajouter un membre
                      </button>
                    </div>
                  }
                </div>

              } @else if (activeTab() === 'files') {
                <!-- Gestion des fichiers -->
                <div class="space-y-6">

                  <!-- Header fichiers -->
                  <div class="flex items-center justify-between">
                    <h3 class="text-lg font-semibold text-gray-900">Fichiers du projet</h3>
                    <button
                      (click)="uploadFile()"
                      class="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                      </svg>
                      Télécharger un fichier
                    </button>
                  </div>

                  <!-- Zone de drop -->
                  <div class="bg-white rounded-xl shadow-sm border-2 border-dashed border-gray-300 p-8 text-center hover:border-blue-400 transition-colors">
                    <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <h3 class="mt-2 text-sm font-medium text-gray-900">Glissez-déposez vos fichiers ici</h3>
                    <p class="mt-1 text-sm text-gray-500">ou cliquez pour sélectionner des fichiers</p>
                    <button
                      (click)="uploadFile()"
                      class="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Sélectionner des fichiers
                    </button>
                  </div>

                  <!-- Liste des fichiers -->
                  <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                    <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    <h3 class="mt-2 text-sm font-medium text-gray-900">Aucun fichier</h3>
                    <p class="mt-1 text-sm text-gray-500">Commencez par télécharger des fichiers pour ce projet.</p>
                    <button
                      (click)="uploadFile()"
                      class="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                      </svg>
                      Télécharger le premier fichier
                    </button>
                  </div>
                </div>

              } @else if (activeTab() === 'comments') {
                <!-- Commentaires et discussions -->
                <div class="space-y-6">

                  <!-- Formulaire nouveau commentaire -->
                  <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Ajouter un commentaire</h3>
                    <div class="space-y-4">
                      <textarea
                        rows="3"
                        placeholder="Écrivez votre commentaire..."
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                        style="color: #000000 !important;"
                        [(ngModel)]="newCommentText"
                      ></textarea>
                      <div class="flex justify-end">
                        <button
                          (click)="addComment()"
                          [disabled]="!newCommentText.trim()"
                          class="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
                        >
                          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                          </svg>
                          Publier
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- Liste des commentaires -->
                  <div class="space-y-4">
                    @if (projectComments().length > 0) {
                      @for (comment of projectComments(); track comment.id) {
                      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div class="flex items-start space-x-4">
                          <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                            <span class="text-xs font-medium text-white">{{ comment.user.name?.substring(0, 2)?.toUpperCase() || 'XX' }}</span>
                          </div>
                          <div class="flex-1">
                            <div class="flex items-center justify-between">
                              <h4 class="text-sm font-semibold text-gray-900">{{ comment.user.name }}</h4>
                              <span class="text-sm text-gray-500">{{ formatDate(comment.created_at) }}</span>
                            </div>
                            <p class="text-sm text-gray-700 mt-2">{{ comment.description }}</p>

                            <div class="flex items-center space-x-4 mt-4">
                              <button class="flex items-center text-sm text-gray-500 hover:text-blue-600">
                                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.001 8.001 0 01-7.293-4.707L3 21l1.293-1.293A8.001 8.001 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z"/>
                                </svg>
                                Répondre
                              </button>
                              <button class="flex items-center text-sm text-gray-500 hover:text-red-600">
                                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                </svg>
                                Supprimer
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      }
                    } @else {
                      <!-- État vide pour les commentaires -->
                      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.001 8.001 0 01-7.293-4.707L3 21l1.293-1.293A8.001 8.001 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z"/>
                        </svg>
                        <h3 class="mt-2 text-sm font-medium text-gray-900">Aucun commentaire</h3>
                        <p class="mt-1 text-sm text-gray-500">Soyez le premier à ajouter un commentaire sur ce projet.</p>
                      </div>
                    }
                  </div>
                </div>

              } @else if (activeTab() === 'analytics') {
                <!-- Analytics du projet -->
                <div class="space-y-6">

                  @if (analyticsLoading()) {
                    <!-- Loading State pour Analytics -->
                    <div class="flex items-center justify-center py-12">
                      <div class="flex flex-col items-center space-y-4">
                        <div class="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
                        <span class="text-gray-600">Chargement des analytics...</span>
                      </div>
                    </div>
                  } @else {

                    <!-- Statistiques du projet -->
                    @if (projectStats(); as stats) {
                      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 class="text-lg font-semibold text-gray-900 mb-6">Statistiques du projet</h3>

                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        </div>

                        <!-- Métriques avancées -->
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t border-gray-200">

                          <div class="text-center">
                            <p class="text-sm font-medium text-gray-600">Score de santé</p>
                            <p class="text-xl font-bold"
                               [class.text-green-600]="stats.health_score >= 80"
                               [class.text-orange-600]="stats.health_score >= 60 && stats.health_score < 80"
                               [class.text-red-600]="stats.health_score < 60">
                              {{ stats.health_score | number:'1.0-0' }}/100
                            </p>
                            <div class="w-full bg-gray-200 rounded-full h-2 mt-2">
                              <div class="h-2 rounded-full"
                                   [class.bg-green-500]="stats.health_score >= 80"
                                   [class.bg-orange-500]="stats.health_score >= 60 && stats.health_score < 80"
                                   [class.bg-red-500]="stats.health_score < 60"
                                   [style.width.%]="stats.health_score"></div>
                            </div>
                          </div>

                          <div class="text-center">
                            <p class="text-sm font-medium text-gray-600">Équipe active</p>
                            <p class="text-xl font-bold text-gray-900">{{ stats.active_team_members_count }}/{{ stats.team_members_count }}</p>
                            <p class="text-sm text-gray-500">membres</p>
                          </div>
                        </div>
                      </div>
                    }


                    <!-- Timeline du projet -->
                    @if (projectTimeline().length > 0) {
                      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 class="text-lg font-semibold text-gray-900 mb-6">Timeline du projet</h3>

                        <div class="space-y-4">
                          @for (milestone of projectTimeline(); track milestone.id) {
                            <div class="flex items-start space-x-4">
                              <div class="flex-shrink-0 w-4 h-4 rounded-full mt-1"
                                   [class.bg-green-500]="milestone.status === 'completed'"
                                   [class.bg-blue-500]="milestone.status === 'in_progress'"
                                   [class.bg-yellow-500]="milestone.status === 'planned'"
                                   [class.bg-red-500]="milestone.status === 'delayed'">
                              </div>
                              <div class="flex-1 min-w-0">
                                <div class="flex items-center justify-between">
                                  <h4 class="text-sm font-semibold text-gray-900">{{ milestone.milestone_name }}</h4>
                                  <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                                        [class.bg-green-100]="milestone.status === 'completed'"
                                        [class.text-green-800]="milestone.status === 'completed'"
                                        [class.bg-blue-100]="milestone.status === 'in_progress'"
                                        [class.text-blue-800]="milestone.status === 'in_progress'"
                                        [class.bg-yellow-100]="milestone.status === 'planned'"
                                        [class.text-yellow-800]="milestone.status === 'planned'"
                                        [class.bg-red-100]="milestone.status === 'delayed'"
                                        [class.text-red-800]="milestone.status === 'delayed'">
                                    {{ getTimelineStatusLabel(milestone.status) }}
                                  </span>
                                </div>
                                @if (milestone.milestone_description) {
                                  <p class="text-sm text-gray-600 mt-1">{{ milestone.milestone_description }}</p>
                                }
                                <div class="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                  <span>Prévu: {{ formatDate(milestone.planned_date) }}</span>
                                  @if (milestone.actual_date) {
                                    <span>Réel: {{ formatDate(milestone.actual_date) }}</span>
                                  }
                                  <span>Progression: {{ milestone.completion_percentage }}%</span>
                                </div>
                                <div class="w-full bg-gray-200 rounded-full h-1 mt-2">
                                  <div class="h-1 rounded-full"
                                       [class.bg-green-500]="milestone.status === 'completed'"
                                       [class.bg-blue-500]="milestone.status === 'in_progress'"
                                       [class.bg-yellow-500]="milestone.status === 'planned'"
                                       [class.bg-red-500]="milestone.status === 'delayed'"
                                       [style.width.%]="milestone.completion_percentage"></div>
                                </div>
                              </div>
                            </div>
                          }
                        </div>
                      </div>
                    }


                    @if (!projectStats() && !projectTimeline().length) {
                      <!-- État vide pour Analytics -->
                      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                        </svg>
                        <h3 class="mt-2 text-sm font-medium text-gray-900">Aucune donnée analytique</h3>
                        <p class="mt-1 text-sm text-gray-500">Les données d'analyse ne sont pas encore disponibles pour ce projet.</p>
                      </div>
                    }
                  }
                </div>
              }
            </div>



          </div>
        </div>
      }

      <!-- Modal d'édition -->
      @if (showEditModal()) {
        <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" (click)="closeEditModal()">
          <div class="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 xl:w-1/2 shadow-lg rounded-lg bg-white" (click)="$event.stopPropagation()">

            <!-- Header du modal -->
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-xl font-bold text-gray-900">Modifier le projet</h3>
              <button (click)="closeEditModal()" class="text-gray-400 hover:text-gray-600">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            @if (editForm(); as form) {
              <div class="space-y-6 max-h-96 overflow-y-auto">

                <!-- Section Informations de base -->
                <div class="border border-gray-200 rounded-lg p-4">
                  <h4 class="font-semibold text-gray-900 mb-4">Informations de base</h4>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

                    <!-- Nom du projet -->
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">Nom du projet *</label>
                      <input
                        type="text"
                        [value]="form.name"
                        (input)="updateEditField('name', $any($event.target).value)"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                        style="color: #000000 !important;"
                        required
                      />
                    </div>

                    <!-- Code du projet -->
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">Code du projet *</label>
                      <input
                        type="text"
                        [value]="form.code"
                        (input)="updateEditField('code', $any($event.target).value)"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                        style="color: #000000 !important;"
                        required
                      />
                    </div>

                    <!-- Département -->
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">Département</label>
                      <input
                        type="text"
                        [value]="form.department"
                        (input)="updateEditField('department', $any($event.target).value)"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                        style="color: #000000 !important;"
                      />
                    </div>

                    <!-- Statut -->
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                      <select
                        [value]="form.status"
                        (change)="updateEditField('status', $any($event.target).value)"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                        style="color: #000000 !important;"
                      >
                        <option value="planifie">Planifié</option>
                        <option value="en_cours">En cours</option>
                        <option value="en_attente">En attente</option>
                        <option value="en_danger">En danger</option>
                        <option value="termine">Terminé</option>
                        <option value="annule">Annulé</option>
                      </select>
                    </div>

                  </div>

                  <!-- Description -->
                  <div class="mt-4">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      rows="3"
                      [value]="form.description"
                      (input)="updateEditField('description', $any($event.target).value)"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                      style="color: #000000 !important;"
                    ></textarea>
                  </div>

                  <!-- Objectifs -->
                  <div class="mt-4">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Objectifs</label>
                    <textarea
                      rows="3"
                      [value]="form.objectives"
                      (input)="updateEditField('objectives', $any($event.target).value)"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                      style="color: #000000 !important;"
                    ></textarea>
                  </div>
                </div>

                <!-- Section Timeline -->
                <div class="border border-gray-200 rounded-lg p-4">
                  <h4 class="font-semibold text-gray-900 mb-4">Timeline</h4>
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">

                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">Date de début</label>
                      <input
                        type="date"
                        [value]="form.start_date"
                        (change)="updateEditField('start_date', $any($event.target).value)"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                        style="color: #000000 !important;"
                      />
                    </div>

                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">Date de fin prévue</label>
                      <input
                        type="date"
                        [value]="form.planned_end_date"
                        (change)="updateEditField('planned_end_date', $any($event.target).value)"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                        style="color: #000000 !important;"
                      />
                    </div>

                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">Date de fin réelle</label>
                      <input
                        type="date"
                        [value]="form.actual_end_date"
                        (change)="updateEditField('actual_end_date', $any($event.target).value)"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                        style="color: #000000 !important;"
                      />
                    </div>
                  </div>
                </div>

                <!-- Section Budget -->
                <div class="border border-gray-200 rounded-lg p-4">
                  <h4 class="font-semibold text-gray-900 mb-4">Budget</h4>
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">Budget estimé (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        [value]="form.estimated_budget"
                        (input)="updateEditField('estimated_budget', $any($event.target).value)"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                        style="color: #000000 !important;"
                      />
                    </div>

                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">Budget réel (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        [value]="form.actual_budget"
                        (input)="updateEditField('actual_budget', $any($event.target).value)"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                        style="color: #000000 !important;"
                      />
                    </div>
                  </div>
                </div>

                <!-- Section Progression et Risques -->
                <div class="border border-gray-200 rounded-lg p-4">
                  <h4 class="font-semibold text-gray-900 mb-4">Progression et Risques</h4>
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">

                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">Progression (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        [value]="form.progress_percentage"
                        (input)="updateEditField('progress_percentage', $any($event.target).value)"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                        style="color: #000000 !important;"
                      />
                    </div>

                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">Indicateur de risque</label>
                      <select
                        [value]="form.risk_indicator"
                        (change)="updateEditField('risk_indicator', $any($event.target).value)"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                        style="color: #000000 !important;"
                      >
                        <option value="low">Faible</option>
                        <option value="medium">Moyen</option>
                        <option value="high">Élevé</option>
                      </select>
                    </div>

                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">Rentabilité (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        [value]="form.profitability_indicator"
                        (input)="updateEditField('profitability_indicator', $any($event.target).value)"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                        style="color: #000000 !important;"
                      />
                    </div>
                  </div>
                </div>

                <!-- Section Client -->
                <div class="border border-gray-200 rounded-lg p-4">
                  <h4 class="font-semibold text-gray-900 mb-4">Informations client</h4>

                  <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-1">Type de client</label>
                    <select
                      [value]="form.client_type"
                      (change)="updateEditField('client_type', $any($event.target).value)"
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                      style="color: #000000 !important;"
                    >
                      <option value="interne">Client interne</option>
                      <option value="externe">Client externe</option>
                    </select>
                  </div>

                  @if (form.client_type === 'externe') {
                    <div class="space-y-3">
                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Nom du client</label>
                        <input
                          type="text"
                          [value]="form.external_client_info?.name || ''"
                          (input)="updateClientName($any($event.target).value)"
                          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                        style="color: #000000 !important;"
                        />
                      </div>
                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Entreprise</label>
                        <input
                          type="text"
                          [value]="form.external_client_info?.company || ''"
                          (input)="updateClientCompany($any($event.target).value)"
                          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                        style="color: #000000 !important;"
                        />
                      </div>
                      <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          [value]="form.external_client_info?.email || ''"
                          (input)="updateClientEmail($any($event.target).value)"
                          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                        style="color: #000000 !important;"
                        />
                      </div>
                    </div>
                  }
                </div>

              </div>

              <!-- Boutons d'action -->
              <div class="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  (click)="closeEditModal()"
                  class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  (click)="saveEditProject()"
                  [disabled]="editLoading() || !form.name?.trim() || !form.code?.trim()"
                  class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
                >
                  @if (editLoading()) {
                    <div class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  }
                  {{ editLoading() ? 'Sauvegarde...' : 'Sauvegarder' }}
                </button>
              </div>
            }
          </div>
        </div>
      }

      <!-- Modal d'équipe -->
      @if (showTeamModal()) {
        <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" (click)="closeTeamModal()">
          <div class="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-lg bg-white" (click)="$event.stopPropagation()">

            <!-- Header du modal -->
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-xl font-bold text-gray-900">
                {{ teamModalMode() === 'add' ? 'Ajouter un membre' : 'Modifier le membre' }}
              </h3>
              <button (click)="closeTeamModal()" class="text-gray-400 hover:text-gray-600">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            @if (teamForm(); as form) {
              <!-- Corps du modal -->
              <div class="space-y-6">

                <!-- Sélection de l'utilisateur -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Utilisateur *</label>
                  <select
                    [value]="form.user_id"
                    (change)="updateTeamField('user_id', $any($event.target).value)"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                    style="color: #000000 !important;"
                    required
                  >
                    <option value="">Sélectionner un utilisateur</option>
                    @for (user of availableUsers(); track user.id) {
                      <option [value]="user.id">{{ user.name }} ({{ user.email }})</option>
                    }
                  </select>
                </div>

                <!-- Rôle -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Rôle *</label>
                  <select
                    [value]="form.role"
                    (change)="updateTeamField('role', $any($event.target).value)"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                    style="color: #000000 !important;"
                    required
                  >
                    <option value="">Sélectionner un rôle</option>
                    @for (role of availableRoles(); track role.id) {
                      <option [value]="role.name">{{ role.display_name || role.name }}</option>
                    }
                  </select>
                </div>

                <!-- Taux horaire -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Taux horaire (€/h)</label>
                  <input
                    type="number"
                    [value]="form.hourly_rate"
                    (input)="updateTeamField('hourly_rate', $any($event.target).value ? Number($any($event.target).value) : null)"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                    style="color: #000000 !important;"
                    placeholder="Optionnel"
                    min="0"
                    step="0.01"
                  />
                </div>

                <!-- Statut actif -->
                <div class="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    [checked]="form.is_active"
                    (change)="updateTeamField('is_active', $any($event.target).checked)"
                    class="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label for="is_active" class="text-sm text-gray-700">Membre actif</label>
                </div>

              </div>

              <!-- Footer du modal -->
              <div class="flex items-center justify-end space-x-4 mt-6 pt-6 border-t border-gray-200">
                <button
                  (click)="closeTeamModal()"
                  type="button"
                  class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  (click)="saveTeamMember()"
                  type="button"
                  [disabled]="teamLoading() || !form.user_id || !form.role"
                  class="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  @if (teamLoading()) {
                    <div class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  }
                  {{ teamLoading() ? 'Sauvegarde...' : (teamModalMode() === 'add' ? 'Ajouter' : 'Modifier') }}
                </button>
              </div>
            }
          </div>
        </div>
      }
    `,
  styles: [`
    .dropdown-enter {
      opacity: 0;
      transform: scale(0.95);
      transition: all 0.1s ease-out;
    }
    .dropdown-enter-active {
      opacity: 1;
      transform: scale(1);
    }
  `]
})
export class ProjectDetailComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private projectsApiService = inject(ProjectsApiService);
  private userService = inject(UserService);
  private destroy$ = new Subject<void>();

  // Signals pour l'état du composant
  project = signal<Project | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  showDropdown = signal(false);
  activeTab = signal<string>('overview');
  isFavorite = signal(false);

  // Signals pour le modal d'édition
  showEditModal = signal(false);
  editForm = signal<any>(null);
  editLoading = signal(false);

  // Signals pour les analytics
  projectTimeline = signal<any[]>([]);
  projectStats = signal<ProjectStats | null>(null);
  projectHistory = signal<any[]>([]);
  projectProgress = signal<any>(null);
  projectComments = signal<any[]>([]);
  analyticsLoading = signal(false);

  // Signals pour la gestion d'équipe
  team = signal<ProjectTeamMember[]>([]);
  showTeamModal = signal(false);
  teamModalMode = signal<'add' | 'edit'>('add');
  teamForm = signal<any>(null);
  teamLoading = signal(false);
  availableUsers = signal<any[]>([]);
  availableRoles = signal<any[]>([]);
  editingMember = signal<any>(null);

  // Variables pour les filtres et recherche
  newCommentText = '';

  // Configuration des onglets
  tabs = [
    {
      id: 'overview',
      label: 'Vue d\'ensemble',
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      badge: null
    },
    {
      id: 'team',
      label: 'Équipe',
      icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z',
      badge: this.project()?.team_members?.length
    },
    {
      id: 'files',
      label: 'Fichiers',
      icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12',
      badge: null
    },
    {
      id: 'comments',
      label: 'Commentaires',
      icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.001 8.001 0 01-7.293-4.707L3 21l1.293-1.293A8.001 8.001 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z',
      badge: 3
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      badge: null
    }
  ];

  private projectId!: number;

  ngOnInit(): void {
    // Récupération de l'ID du projet depuis l'URL
    this.route.params.pipe(
      takeUntil(this.destroy$),
      switchMap(params => {
        this.projectId = +params['id'];
        return of(this.projectId);
      })
    ).subscribe(() => {
      this.loadProject();
    });

    // Gestion des clics extérieurs pour fermer le dropdown
    document.addEventListener('click', this.onDocumentClick.bind(this));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    document.removeEventListener('click', this.onDocumentClick.bind(this));
  }

  private onDocumentClick(event: Event): void {
    if (this.showDropdown()) {
      const target = event.target as HTMLElement;
      if (!target.closest('.relative')) {
        this.showDropdown.set(false);
      }
    }
  }

  loadProject(): void {
    this.loading.set(true);
    this.error.set(null);

    this.projectsApiService.getProject(this.projectId, ['team', 'client', 'manager']).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.loading.set(false)),
      catchError(error => {
        this.error.set('Erreur lors du chargement du projet');
        console.error('Erreur lors du chargement du projet:', error);
        return of(null);
      })
    ).subscribe(response => {
      if (response?.data) {
        this.project.set(response.data);
        // Initialiser aussi le signal team avec les membres de l'équipe
        if (response.data.team_members) {
          this.team.set(response.data.team_members);
        }
        console.log('Projet chargé:', response.data);
      }
    });
  }



  // Actions du header
  goBack(): void {
    this.router.navigate(['/projects/list']);
  }

  toggleDropdown(): void {
    this.showDropdown.set(!this.showDropdown());
  }

  toggleFavorite(): void {
    this.isFavorite.set(!this.isFavorite());
  }

  shareProject(): void {
    // TODO: Implémenter le partage
    console.log('Partager le projet');
  }

  isBudgetOverrun(actualBudget: number, estimatedBudget?: number): boolean {
    return actualBudget > (estimatedBudget || 0);
  }

  // Actions du dropdown
  editProject(): void {
    const currentProject = this.project();
    if (!currentProject) return;

    // Pré-remplir le formulaire avec les données actuelles du projet
    this.editForm.set({
      name: currentProject.name || '',
      code: currentProject.code || '',
      description: currentProject.description || '',
      objectives: currentProject.objectives || '',
      status: currentProject.status || 'planifie',
      progress_percentage: currentProject.progress_percentage || 0,
      estimated_budget: currentProject.estimated_budget || null,
      actual_budget: currentProject.actual_budget || null,
      start_date: currentProject.start_date ? new Date(currentProject.start_date).toISOString().split('T')[0] : '',
      planned_end_date: currentProject.planned_end_date ? new Date(currentProject.planned_end_date).toISOString().split('T')[0] : '',
      actual_end_date: currentProject.actual_end_date ? new Date(currentProject.actual_end_date).toISOString().split('T')[0] : '',
      department: currentProject.department || '',
      client_type: currentProject.client_type || 'interne',
      risk_indicator: currentProject.risk_indicator || 'low',
      profitability_indicator: (currentProject as any).profitability_indicator || null,
      external_client_info: currentProject.external_client_info || {
        name: '',
        company: '',
        email: ''
      }
    });

    this.showEditModal.set(true);
    this.showDropdown.set(false);
  }

  duplicateProject(): void {
    if (!this.project()) return;

    this.projectsApiService.duplicateProject(this.projectId).pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.error('Erreur lors de la duplication:', error);
        return of(null);
      })
    ).subscribe(result => {
      if (result) {
        // Rediriger vers le nouveau projet
        console.log('Projet dupliqué avec succès');
      }
    });
    this.showDropdown.set(false);
  }

  exportProject(): void {
    // TODO: Implémenter l'export
    console.log('Exporter le projet');
    this.showDropdown.set(false);
  }

  archiveProject(): void {
    // TODO: Implémenter l'archivage
    console.log('Archiver le projet');
    this.showDropdown.set(false);
  }

  deleteProject(): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce projet ?')) {
      this.projectsApiService.deleteProject(this.projectId).pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Erreur lors de la suppression:', error);
          return of(null);
        })
      ).subscribe(result => {
        if (result) {
          this.router.navigate(['/projects/list']);
        }
      });
    }
    this.showDropdown.set(false);
  }

  // Méthodes pour le modal d'édition
  closeEditModal(): void {
    this.showEditModal.set(false);
    this.editForm.set(null);
  }

  saveEditProject(): void {
    const form = this.editForm();
    if (!form || !this.project()) return;

    this.editLoading.set(true);
    this.projectsApiService.updateProject(this.projectId, form).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.editLoading.set(false))
    ).subscribe({
      next: (response: any) => {
        if (response.success) {
          // Mettre à jour le projet local avec les nouvelles données
          this.project.set({ ...this.project()!, ...form });
          this.closeEditModal();
          console.log('Projet mis à jour avec succès');
          // Optionnel: recharger le projet complet
          this.loadProject();
        }
      },
      error: (error) => {
        console.error('Erreur lors de la mise à jour du projet:', error);
        this.error.set('Erreur lors de la mise à jour du projet');
      }
    });
  }

  updateEditField(field: string, value: any): void {
    const currentForm = this.editForm();
    if (currentForm) {
      this.editForm.set({ ...currentForm, [field]: value });
    }
  }

  updateClientName(value: string): void {
    const currentForm = this.editForm();
    if (currentForm) {
      this.editForm.set({
        ...currentForm,
        external_client_info: {
          ...currentForm.external_client_info,
          name: value
        }
      });
    }
  }

  updateClientCompany(value: string): void {
    const currentForm = this.editForm();
    if (currentForm) {
      this.editForm.set({
        ...currentForm,
        external_client_info: {
          ...currentForm.external_client_info,
          company: value
        }
      });
    }
  }

  updateClientEmail(value: string): void {
    const currentForm = this.editForm();
    if (currentForm) {
      this.editForm.set({
        ...currentForm,
        external_client_info: {
          ...currentForm.external_client_info,
          email: value
        }
      });
    }
  }

  // Gestion des onglets
  setActiveTab(tabId: string): void {
    this.activeTab.set(tabId);

    // Charger les données spécifiques à chaque onglet
    if (tabId === 'analytics' && this.projectId) {
      this.loadAnalyticsData();
    } else if (tabId === 'team' && this.projectId) {
      this.loadProjectTeam();
    } else if (tabId === 'overview' && this.projectId) {
      this.loadProjectProgress();
    } else if (tabId === 'comments' && this.projectId) {
      this.loadProjectComments();
    }
  }

  private loadProjectTeam(): void {
    // Charger explicitement l'équipe du projet via l'endpoint dédié
    this.projectsApiService.getProjectTeam(this.projectId).pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.error('Erreur lors du chargement de l\'équipe:', error);
        return of(null);
      })
    ).subscribe(response => {
      if (response?.data) {
        // Mettre à jour l'équipe dans le projet actuel
        const currentProject = this.project();
        if (currentProject) {
          this.project.set({
            ...currentProject,
            team_members: response.data
          });
        }
        // Mettre à jour le signal team aussi
        this.team.set(response.data);
      }
    });
  }

  private loadProjectProgress(): void {
    // Charger explicitement la progression du projet via l'endpoint dédié
    this.projectsApiService.getProjectProgress(this.projectId).pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.error('Erreur lors du chargement de la progression:', error);
        return of(null);
      })
    ).subscribe(response => {
      if (response?.data) {
        this.projectProgress.set(response.data);
      }
    });
  }

  private loadProjectComments(): void {
    // Charger les commentaires via l'API
    // Utilise l'endpoint d'historique pour récupérer les commentaires
    this.projectsApiService.getProjectHistory(this.projectId, 20).pipe(
      takeUntil(this.destroy$),
      map(response => {
        // Filtrer seulement les commentaires de l'historique
        const history = response?.data || [];
        return history.filter((h: any) => h.action_type === 'comment' || h.comment);
      }),
      catchError(error => {
        console.error('Erreur lors du chargement des commentaires:', error);
        return of([]);
      })
    ).subscribe(comments => {
      this.projectComments.set(comments);
    });
  }


  // Actions de l'équipe
  addTeamMember(): void {
    this.teamModalMode.set('add');
    this.teamForm.set({
      user_id: '',
      role: 'membre',
      hourly_rate: null,
      is_active: true
    });
    this.editingMember.set(null);
    this.loadAvailableUsers();
    this.loadAvailableRoles();
    this.showTeamModal.set(true);
  }

  editTeamMember(member: any): void {
    this.teamModalMode.set('edit');
    this.teamForm.set({
      user_id: member.user_id,
      role: member.role,
      hourly_rate: member.hourly_rate,
      is_active: member.is_active
    });
    this.editingMember.set(member);
    this.loadAvailableUsers();
    this.loadAvailableRoles();
    this.showTeamModal.set(true);
  }

  removeTeamMember(member: ProjectTeamMember): void {
    if (confirm('Êtes-vous sûr de vouloir retirer ce membre de l\'équipe ?')) {
      this.projectsApiService.removeTeamMember(this.projectId, member.id).pipe(
        takeUntil(this.destroy$),
        catchError(error => {
          console.error('Erreur lors de la suppression du membre:', error);
          return of(null);
        })
      ).subscribe(result => {
        if (result) {
          this.loadProject(); // Recharger le projet
        }
      });
    }
  }

  // Méthodes utilitaires pour l'équipe
  loadAvailableUsers(): void {
    this.userService.getAllUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (users) => {
          // Filtrer les utilisateurs qui ne sont pas déjà dans l'équipe du projet
          const currentTeam = this.team();
          const availableUsers = users.filter(user =>
            !currentTeam.some(member => member.user_id === user.id)
          );

          // Adapter le format pour le template
          const formattedUsers = availableUsers.map(user => ({
            id: user.id,
            name: `${user.first_name} ${user.last_name}`,
            email: user.email,
            status: user.status
          }));

          this.availableUsers.set(formattedUsers);
        },
        error: (error) => {
          console.error('Erreur lors du chargement des utilisateurs:', error);
          this.availableUsers.set([]);
        }
      });
  }

  loadAvailableRoles(): void {
    this.userService.getRoles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (roles) => {
          this.availableRoles.set(roles);
        },
        error: (error) => {
          console.error('Erreur lors du chargement des rôles:', error);
          this.availableRoles.set([]);
        }
      });
  }

  closeTeamModal(): void {
    this.showTeamModal.set(false);
    this.teamForm.set(null);
    this.editingMember.set(null);
  }

  saveTeamMember(): void {
    const form = this.teamForm();
    if (!form || !form.user_id) return;

    this.teamLoading.set(true);

    const operation = this.teamModalMode() === 'add'
      ? this.projectsApiService.addTeamMember(this.projectId, form)
      : this.projectsApiService.updateTeamMemberRole(this.projectId, this.editingMember().id, form);

    operation.pipe(
      takeUntil(this.destroy$),
      finalize(() => this.teamLoading.set(false))
    ).subscribe({
      next: (response: any) => {
        if (response) {
          this.closeTeamModal();
          this.loadProject(); // Recharger pour voir les changements
        }
      },
      error: (error) => {
        console.error('Erreur lors de la sauvegarde du membre:', error);
      }
    });
  }

  updateTeamField(field: string, value: any): void {
    const currentForm = this.teamForm();
    if (currentForm) {
      this.teamForm.set({ ...currentForm, [field]: value });
    }
  }

  // Actions de fichiers
  uploadFile(): void {
    // TODO: Implémenter l'upload de fichier
    console.log('Télécharger un fichier');
  }

  // Actions de commentaires
  addComment(): void {
    if (this.newCommentText?.trim()) {
      // TODO: Ajouter le commentaire via l'API
      console.log('Ajouter un commentaire:', this.newCommentText);
      this.newCommentText = '';
    }
  }

  // Actions diverses
  updateProgress(): void {
    // TODO: Ouvrir un modal de mise à jour de progression avec input utilisateur
    // Pour l'instant, cette action est en attente d'interface utilisateur
    console.log('Fonctionnalité de mise à jour progression nécessite un modal d\'édition');
  }

  updateStatus(newStatus: string, comment?: string): void {
    const statusData = {
      status: newStatus as any,
      comment: comment
    };

    this.projectsApiService.updateProjectStatus(this.projectId, newStatus).pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.error('Erreur lors de la mise à jour du statut:', error);
        return of(null);
      })
    ).subscribe(result => {
      if (result) {
        this.loadProject(); // Recharger le projet pour mettre à jour le statut
      }
    });
  }

  // Chargement des données analytics
  loadAnalyticsData(): void {
    if (!this.projectId) return;

    this.analyticsLoading.set(true);

    // Charger toutes les données analytics en parallèle
    const timeline$ = this.projectsApiService.getProjectTimeline(this.projectId);
    const stats$ = this.projectsApiService.getProjectStats(this.projectId);

    // Timeline
    timeline$.pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.error('Erreur lors du chargement de la timeline:', error);
        return of(null);
      })
    ).subscribe((response: any) => {
      if (response?.data) {
        this.projectTimeline.set(response.data);
      }
    });

    // Stats
    stats$.pipe(
      takeUntil(this.destroy$),
      finalize(() => this.analyticsLoading.set(false)),
      catchError(error => {
        console.error('Erreur lors du chargement des stats:', error);
        return of(null);
      })
    ).subscribe((response: any) => {
      if (response?.data) {
        this.projectStats.set(response.data);
      }
    });

    // UTILISATION DES NOUVEAUX ENDPOINTS TIME-TRACKING
    this.loadAllTimeData();

  }

  // Méthodes utilitaires
  getStatusLabel(status: ProjectStatus): string {
    return PROJECT_STATUS_LABELS[status] || status;
  }

  getStatusClasses(status: ProjectStatus): string {
    const baseClasses = 'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium';
    switch (status) {
      case ProjectStatus.EN_COURS:
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case ProjectStatus.EN_ATTENTE:
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case ProjectStatus.EN_DANGER:
        return `${baseClasses} bg-red-100 text-red-800`;
      case ProjectStatus.TERMINE:
        return `${baseClasses} bg-green-100 text-green-800`;
      case ProjectStatus.ANNULE:
        return `${baseClasses} bg-gray-100 text-gray-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  }

  getStatusDotClasses(status: ProjectStatus): string {
    switch (status) {
      case ProjectStatus.EN_COURS:
        return 'bg-blue-600';
      case ProjectStatus.EN_ATTENTE:
        return 'bg-yellow-600';
      case ProjectStatus.EN_DANGER:
        return 'bg-red-600';
      case ProjectStatus.TERMINE:
        return 'bg-green-600';
      case ProjectStatus.ANNULE:
        return 'bg-gray-600';
      default:
        return 'bg-gray-600';
    }
  }

  getRiskLabel(risk: string): string {
    switch (risk) {
      case 'low': return 'Faible';
      case 'medium': return 'Moyen';
      case 'high': return 'Élevé';
      default: return risk;
    }
  }


  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  }

  getDaysRemaining(endDate: string): number {
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getTimelineStatusLabel(status: string): string {
    switch (status) {
      case 'completed': return 'Terminé';
      case 'in_progress': return 'En cours';
      case 'planned': return 'Planifié';
      case 'delayed': return 'En retard';
      default: return status;
    }
  }

  getHistoryActionDescription(history: any): string {
    switch (history.action_type) {
      case 'status_change':
        return `a changé le statut de "${history.old_value}" vers "${history.new_value}"`;
      case 'progress_update':
        return `a mis à jour la progression de ${history.old_value}% vers ${history.new_value}%`;
      case 'team_member_added':
        return `a ajouté un membre à l'équipe`;
      case 'team_member_removed':
        return `a retiré un membre de l'équipe`;
      case 'project_created':
        return `a créé le projet`;
      case 'project_updated':
        return `a modifié le projet${history.field_changed ? ` (${history.field_changed})` : ''}`;
      case 'budget_updated':
        return `a mis à jour le budget de ${history.old_value}€ vers ${history.new_value}€`;
      default:
        return `a effectué une action (${history.action_type})`;
    }
  }

  /**
   * Formate les noms des champs modifiés pour l'affichage
   */
  formatFieldNames(fieldChanged: string): string {
    if (!fieldChanged) return '';

    const fieldMap: Record<string, string> = {
      'name': 'Nom',
      'description': 'Description',
      'status': 'Statut',
      'progress_percentage': 'Progression',
      'estimated_budget': 'Budget estimé',
      'actual_budget': 'Budget réel',
      'start_date': 'Date de début',
      'planned_end_date': 'Date de fin prévue',
      'actual_end_date': 'Date de fin réelle',
      'risk_indicator': 'Indicateur de risque',
      'profitability_indicator': 'Indicateur de rentabilité',
      'project_manager_id': 'Chef de projet',
      'department': 'Département',
      'updated_at': 'Dernière modification'
    };

    return fieldChanged.split(',')
      .map(field => fieldMap[field.trim()] || field.trim())
      .join(', ');
  }

  /**
   * Formate les valeurs JSON de l'historique pour l'affichage
   */
  formatHistoryValue(value: string): string {
    if (!value) return '';

    try {
      const parsed = JSON.parse(value);

      // Si c'est un objet, on formate les propriétés importantes
      if (typeof parsed === 'object' && parsed !== null) {
        const formatted: string[] = [];

        for (const [key, val] of Object.entries(parsed)) {
          if (key === 'status') {
            formatted.push(`Statut: ${this.getStatusLabel(val as any)}`);
          } else if (key === 'progress_percentage') {
            formatted.push(`Progression: ${val}%`);
          } else if (key === 'estimated_budget') {
            formatted.push(`Budget estimé: ${Number(val).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`);
          } else if (key === 'actual_budget') {
            formatted.push(`Budget réel: ${Number(val).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`);
          } else if (key === 'risk_indicator') {
            formatted.push(`Risque: ${this.getRiskLabel(val as string)}`);
          } else if (key === 'profitability_indicator') {
            formatted.push(`Rentabilité: ${val}%`);
          } else if (key.includes('date') && val) {
            formatted.push(`${key}: ${this.formatDate(val as string)}`);
          } else if (val !== null && val !== undefined && val !== '') {
            formatted.push(`${key}: ${val}`);
          }
        }

        return formatted.length > 0 ? formatted.join(', ') : JSON.stringify(parsed);
      }

      return String(parsed);
    } catch {
      return value;
    }
  }

  /**
   * Récupère le nom de l'utilisateur à partir de l'ID
   */
  getUserNameFromHistory(userId: number | null): string {
    if (!userId) return 'Système';

    // Si c'est le chef de projet actuel
    if (Number(this.project()?.project_manager?.id) === userId) {
      return this.project()?.project_manager?.name || 'Utilisateur inconnu';
    }

    // Chercher dans l'équipe
    const teamMember = this.project()?.team_members?.find(member => member.user_id === userId);
    if (teamMember) {
      return teamMember.user.name;
    }

    // Valeur par défaut
    return `Utilisateur ${userId}`;
  }

  /**
   * Calcule le pourcentage de largeur pour la barre de progression du budget
   */
  getBudgetProgressWidth(actualBudget: number, estimatedBudget: number): number {
    if (!estimatedBudget || estimatedBudget === 0) return 0;
    return Math.min((actualBudget / estimatedBudget) * 100, 100);
  }

  /**
   * Expose Number constructor to template
   */
  Number = Number;

  // ==========================================
  // IMPLÉMENTATION DES ENDPOINTS MANQUANTS
  // ==========================================

  /**
   * 1. updateProject() - Mettre à jour un projet
   */
  isEditingProject = signal(false);
  projectForm = signal<any>(null);

  startEditProject(): void {
    const currentProject = this.project();
    if (!currentProject) return;

    this.projectForm.set({
      name: currentProject.name,
      description: currentProject.description,
      status: currentProject.status,
      priority: (currentProject as any).priority || 'normale',
      start_date: currentProject.start_date,
      end_date: (currentProject as any).end_date || null,
      budget: (currentProject as any).budget || 0
    });
    this.isEditingProject.set(true);
  }

  cancelEditProject(): void {
    this.isEditingProject.set(false);
    this.projectForm.set(null);
  }

  saveProject(): void {
    const form = this.projectForm();
    if (!form || !this.project()) return;

    this.loading.set(true);
    this.projectsApiService.updateProject(this.projectId, form).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.project.set({ ...this.project()!, ...form });
          this.isEditingProject.set(false);
          this.projectForm.set(null);
          console.log('Projet mis à jour avec succès');
        }
      },
      error: (error) => {
        console.error('Erreur lors de la mise à jour du projet:', error);
        this.error.set('Erreur lors de la mise à jour du projet');
      }
    });
  }

  /**
   * 2. updateTeamMemberRole() - Modifier le rôle d'un membre
   */
  editingMemberRole = signal<{ memberId: number; role: string } | null>(null);

  startEditMemberRole(memberId: number, currentRole: string): void {
    this.editingMemberRole.set({ memberId, role: currentRole });
  }

  saveTeamMemberRole(memberId: number, newRole: string): void {
    if (!newRole.trim()) return;

    this.loading.set(true);
    this.projectsApiService.updateTeamMemberRole(this.projectId, memberId, { role: newRole }).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: (response: any) => {
        if (response.success) {
          // Mettre à jour le rôle dans l'état local
          const currentProject = this.project();
          if (currentProject?.team_members) {
            const memberIndex = currentProject.team_members.findIndex(m => m.id === memberId);
            if (memberIndex !== -1) {
              (currentProject.team_members[memberIndex] as any).role = newRole;
              this.project.set({ ...currentProject });
            }
          }
          this.editingMemberRole.set(null);
          console.log('Rôle du membre mis à jour avec succès');
        }
      },
      error: (error) => {
        console.error('Erreur lors de la mise à jour du rôle:', error);
        this.error.set('Erreur lors de la mise à jour du rôle');
      }
    });
  }

  cancelEditMemberRole(): void {
    this.editingMemberRole.set(null);
  }

  /**
   * 3. getProjectTimeSummary() - Résumé temps du projet
   */
  projectTimeSummary = signal<any>(null);
  timeSummaryLoading = signal(false);

  loadProjectTimeSummary(): void {
    this.timeSummaryLoading.set(true);
    this.projectsApiService.getProjectTimeSummary(this.projectId).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.timeSummaryLoading.set(false))
    ).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.projectTimeSummary.set(response.data);
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement du résumé temps:', error);
      }
    });
  }

  /**
   * 4. getProjectTimeEntries() - Entrées de temps du projet
   */
  projectTimeEntries = signal<any[]>([]);
  timeEntriesLoading = signal(false);

  loadProjectTimeEntries(): void {
    this.timeEntriesLoading.set(true);
    this.projectsApiService.getProjectTimeEntries(this.projectId).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.timeEntriesLoading.set(false))
    ).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.projectTimeEntries.set(response.data || []);
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement des entrées temps:', error);
      }
    });
  }

  /**
   * 5. getProjectTimeAnalytics() - Analytics temps du projet
   */
  projectTimeAnalytics = signal<any>(null);
  timeAnalyticsLoading = signal(false);

  loadProjectTimeAnalytics(): void {
    this.timeAnalyticsLoading.set(true);
    this.projectsApiService.getProjectTimeAnalytics(this.projectId).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.timeAnalyticsLoading.set(false))
    ).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.projectTimeAnalytics.set(response.data);
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement des analytics temps:', error);
      }
    });
  }

  /**
   * Charger toutes les données temps
   */
  loadAllTimeData(): void {
    this.loadProjectTimeSummary();
    this.loadProjectTimeEntries();
    this.loadProjectTimeAnalytics();
  }
}