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
  ProjectTimeline,
  ProjectStats,
  ProjectTimeSummary,
  ProjectTimeAnalytics
} from '../../models/project.models';
import { UserEntity } from '../../../../domain/entities/user.entity';
import { ClientEntity } from '../../../../domain/entities/client.entity';

// Interface pour les tâches (utilise les vraies données de l'API)
interface Task {
  id: number;
  title: string;
  description?: string;
  status: 'en_cours' | 'en_attente' | 'en_danger' | 'termine' | 'annule';
  priority?: 'haute' | 'moyenne' | 'basse';
  assigned_to_user?: UserEntity;
  due_date?: string;
  progress_percentage?: number;
  estimated_hours?: number;
  actual_hours?: number;
}

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
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">

            <!-- Contenu principal (2/3) -->
            <div class="lg:col-span-2 space-y-8">

              @if (activeTab() === 'overview') {
                <!-- Vue d'ensemble -->
                <div class="space-y-6">

                  <!-- Description et objectifs -->
                  <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Description du projet</h3>
                    @if (proj.description) {
                      <p class="text-gray-600 leading-relaxed">{{ proj.description }}</p>
                    } @else {
                      <p class="text-gray-400 italic">Aucune description disponible.</p>
                    }

                    @if (proj.objectives) {
                      <div class="mt-6">
                        <h4 class="text-md font-semibold text-gray-900 mb-3">Objectifs</h4>
                        <p class="text-gray-600 leading-relaxed">{{ proj.objectives }}</p>
                      </div>
                    }
                  </div>

                  <!-- Timeline et jalons -->
                  <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Timeline du projet</h3>
                    <div class="space-y-4">
                      <div class="flex items-center justify-between">
                        <div class="flex items-center">
                          <div class="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                          <span class="text-sm font-medium text-gray-900">Début du projet</span>
                        </div>
                        <span class="text-sm text-gray-600">{{ formatDate(proj.start_date) }}</span>
                      </div>

                      @if (proj.planned_end_date) {
                        <div class="flex items-center justify-between">
                          <div class="flex items-center">
                            <div class="w-3 h-3" [class.bg-green-500]="proj.status === 'termine'" [class.bg-yellow-500]="proj.status !== 'termine'"></div>
                            <span class="text-sm font-medium text-gray-900 ml-3">Fin prévue</span>
                          </div>
                          <span class="text-sm text-gray-600">{{ formatDate(proj.planned_end_date) }}</span>
                        </div>
                      }

                      @if (proj.actual_end_date) {
                        <div class="flex items-center justify-between">
                          <div class="flex items-center">
                            <div class="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                            <span class="text-sm font-medium text-gray-900">Fin réelle</span>
                          </div>
                          <span class="text-sm text-gray-600">{{ formatDate(proj.actual_end_date) }}</span>
                        </div>
                      }
                    </div>

                    <!-- Indicateur de temps restant -->
                    @if (proj.status !== 'termine' && proj.planned_end_date) {
                      <div class="mt-6 p-4 bg-gray-50 rounded-lg">
                        <div class="flex items-center justify-between">
                          <span class="text-sm font-medium text-gray-900">Temps restant</span>
                          <span class="text-sm" [class.text-red-600]="getDaysRemaining(proj.planned_end_date) < 0" [class.text-green-600]="getDaysRemaining(proj.planned_end_date) > 30" [class.text-orange-600]="getDaysRemaining(proj.planned_end_date) >= 0 && getDaysRemaining(proj.planned_end_date) <= 30">
                            {{ getDaysRemaining(proj.planned_end_date) }} jours
                          </span>
                        </div>
                      </div>
                    }
                  </div>

                  <!-- Progression -->
                  <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div class="flex items-center justify-between mb-4">
                      <h3 class="text-lg font-semibold text-gray-900">Progression</h3>
                      <span class="text-2xl font-bold" [class.text-green-600]="proj.progress_percentage >= 75" [class.text-blue-600]="proj.progress_percentage >= 50 && proj.progress_percentage < 75" [class.text-orange-600]="proj.progress_percentage >= 25 && proj.progress_percentage < 50" [class.text-red-600]="proj.progress_percentage < 25">
                        {{ proj.progress_percentage }}%
                      </span>
                    </div>

                    <div class="w-full bg-gray-200 rounded-full h-4 mb-4">
                      <div
                        class="h-4 rounded-full transition-all duration-500 ease-in-out"
                        [class.bg-green-500]="proj.progress_percentage >= 75"
                        [class.bg-blue-500]="proj.progress_percentage >= 50 && proj.progress_percentage < 75"
                        [class.bg-orange-500]="proj.progress_percentage >= 25 && proj.progress_percentage < 50"
                        [class.bg-red-500]="proj.progress_percentage < 25"
                        [style.width.%]="proj.progress_percentage"
                      ></div>
                    </div>

                    <!-- Métriques de performance -->
                    <div class="grid grid-cols-2 gap-4">
                      @if (proj.estimated_budget || proj.actual_budget) {
                        <div class="bg-gray-50 rounded-lg p-4">
                          <h4 class="text-sm font-medium text-gray-600 mb-2">Budget</h4>
                          @if (proj.estimated_budget) {
                            <div class="text-sm text-gray-600">Prévu: {{ formatCurrency(proj.estimated_budget) }}</div>
                          }
                          @if (proj.actual_budget) {
                            <div class="text-sm font-semibold" [class.text-red-600]="isBudgetOverrun(proj.actual_budget, proj.estimated_budget)" [class.text-green-600]="!isBudgetOverrun(proj.actual_budget, proj.estimated_budget)">
                              Réel: {{ formatCurrency(proj.actual_budget) }}
                            </div>
                          }
                        </div>
                      }

                      <div class="bg-gray-50 rounded-lg p-4">
                        <h4 class="text-sm font-medium text-gray-600 mb-2">Équipe</h4>
                        <div class="text-sm text-gray-600">
                          {{ proj.team_members?.length || 0 }} membre(s)
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              } @else if (activeTab() === 'tasks') {
                <!-- Gestion des tâches -->
                <div class="space-y-6">

                  <!-- Header des tâches -->
                  <div class="flex items-center justify-between">
                    <h3 class="text-lg font-semibold text-gray-900">Tâches du projet</h3>
                    <button
                      (click)="createTask()"
                      class="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0 0h6m-6 0H6"/>
                      </svg>
                      Nouvelle tâche
                    </button>
                  </div>

                  <!-- Filtres des tâches -->
                  <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <div class="flex items-center space-x-4">
                      <div class="flex-1">
                        <input
                          type="text"
                          placeholder="Rechercher une tâche..."
                          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          [(ngModel)]="taskSearchQuery"
                          (input)="filterTasks()"
                        >
                      </div>
                      <select
                        class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        [(ngModel)]="taskStatusFilter"
                        (change)="filterTasks()"
                      >
                        <option value="">Tous les statuts</option>
                        <option value="en_cours">En cours</option>
                        <option value="en_attente">En attente</option>
                        <option value="termine">Terminé</option>
                      </select>
                    </div>
                  </div>

                  <!-- Liste des tâches -->
                  <div class="space-y-3">
                    @if (recentTasks().length > 0) {
                      @for (task of recentTasks(); track task.id) {
                        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                          <div class="flex items-start justify-between">
                            <div class="flex-1">
                              <div class="flex items-center">
                                <h4 class="text-md font-semibold text-gray-900">{{ task.title }}</h4>
                                @if (task.priority) {
                                  <span
                                    class="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                                    [class.bg-red-100]="task.priority === 'haute'"
                                    [class.text-red-800]="task.priority === 'haute'"
                                    [class.bg-yellow-100]="task.priority === 'moyenne'"
                                    [class.text-yellow-800]="task.priority === 'moyenne'"
                                    [class.bg-green-100]="task.priority === 'basse'"
                                    [class.text-green-800]="task.priority === 'basse'"
                                  >
                                    {{ task.priority }}
                                  </span>
                                }
                              </div>
                              @if (task.description) {
                                <p class="text-sm text-gray-600 mt-1">{{ task.description }}</p>
                              }
                              <div class="flex items-center mt-3 space-x-4">
                                @if (task.assigned_to_user) {
                                  <div class="flex items-center">
                                    <div class="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mr-2">
                                      <span class="text-xs font-medium text-white">
                                        {{ task.assigned_to_user.name || task.assigned_to_user.getDisplayName?.() || 'N/A' }}
                                      </span>
                                    </div>
                                    <span class="text-sm text-gray-600">{{ task.assigned_to_user.name || task.assigned_to_user.getDisplayName?.() || 'N/A' }}</span>
                                  </div>
                                }
                                @if (task.due_date) {
                                  <div class="flex items-center text-sm text-gray-600">
                                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                    </svg>
                                    {{ formatDate(task.due_date) }}
                                  </div>
                                }
                              </div>
                            </div>
                            <div class="flex items-center space-x-2 ml-4">
                              <span
                                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                                [class.bg-green-100]="task.status === 'termine'"
                                [class.text-green-800]="task.status === 'termine'"
                                [class.bg-blue-100]="task.status === 'en_cours'"
                                [class.text-blue-800]="task.status === 'en_cours'"
                                [class.bg-yellow-100]="task.status === 'en_attente'"
                                [class.text-yellow-800]="task.status === 'en_attente'"
                              >
                                {{ getTaskStatusLabel(task.status) }}
                              </span>
                              <button
                                (click)="editTask(task)"
                                class="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                              >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                </svg>
                              </button>
                            </div>
                          </div>

                          @if (task.progress_percentage !== undefined) {
                            <div class="mt-4">
                              <div class="flex justify-between text-sm mb-1">
                                <span class="text-gray-600">Progression</span>
                                <span class="text-gray-900 font-medium">{{ task.progress_percentage }}%</span>
                              </div>
                              <div class="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  class="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                  [style.width.%]="task.progress_percentage"
                                ></div>
                              </div>
                            </div>
                          }
                        </div>
                      }
                    } @else {
                      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                        </svg>
                        <h3 class="mt-2 text-sm font-medium text-gray-900">Aucune tâche</h3>
                        <p class="mt-1 text-sm text-gray-500">Commencez par créer une nouvelle tâche pour ce projet.</p>
                        <button
                          (click)="createTask()"
                          class="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                        >
                          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0 0h6m-6 0H6"/>
                          </svg>
                          Créer une tâche
                        </button>
                      </div>
                    }
                  </div>
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
                                  {{ member.user?.getInitials?.() || (member.user?.name?.substring(0, 2)?.toUpperCase()) || 'XX' }}
                                </span>
                              </div>
                              <div class="ml-4">
                                <h4 class="text-sm font-semibold text-gray-900">
                                  {{ member.user?.name || member.user?.getDisplayName?.() || 'Utilisateur inconnu' }}
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
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        [(ngModel)]="newCommentText"
                      ></textarea>
                      <div class="flex justify-end">
                        <button
                          (click)="addComment()"
                          [disabled]="!newCommentText?.trim()"
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
                          <div class="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
                            <div class="flex items-center">
                              <div class="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                                </svg>
                              </div>
                              <div class="ml-4">
                                <p class="text-sm font-medium text-gray-600">Total Tâches</p>
                                <p class="text-2xl font-bold text-gray-900">{{ stats.total_tasks }}</p>
                              </div>
                            </div>
                          </div>

                          <div class="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
                            <div class="flex items-center">
                              <div class="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                                </svg>
                              </div>
                              <div class="ml-4">
                                <p class="text-sm font-medium text-gray-600">Terminées</p>
                                <p class="text-2xl font-bold text-gray-900">{{ stats.completed_tasks }}</p>
                              </div>
                            </div>
                          </div>

                          <div class="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-4">
                            <div class="flex items-center">
                              <div class="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                              </div>
                              <div class="ml-4">
                                <p class="text-sm font-medium text-gray-600">En cours</p>
                                <p class="text-2xl font-bold text-gray-900">{{ stats.in_progress_tasks }}</p>
                              </div>
                            </div>
                          </div>

                          <div class="bg-gradient-to-r from-red-50 to-red-100 rounded-lg p-4">
                            <div class="flex items-center">
                              <div class="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                                </svg>
                              </div>
                              <div class="ml-4">
                                <p class="text-sm font-medium text-gray-600">Bloquées</p>
                                <p class="text-2xl font-bold text-gray-900">{{ stats.blocked_tasks }}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <!-- Métriques avancées -->
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t border-gray-200">
                          <div class="text-center">
                            <p class="text-sm font-medium text-gray-600">Taux de completion</p>
                            <p class="text-xl font-bold text-blue-600">{{ stats.tasks_completion_rate | number:'1.1-1' }}%</p>
                            <div class="w-full bg-gray-200 rounded-full h-2 mt-2">
                              <div class="bg-blue-500 h-2 rounded-full" [style.width.%]="stats.tasks_completion_rate"></div>
                            </div>
                          </div>

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

                    <!-- Résumé temporel -->
                    @if (projectTimeSummary(); as timeSummary) {
                      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 class="text-lg font-semibold text-gray-900 mb-6">Résumé temporel</h3>

                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                          <div class="bg-gray-50 rounded-lg p-4">
                            <p class="text-sm font-medium text-gray-600">Heures estimées</p>
                            <p class="text-xl font-bold text-gray-900">{{ timeSummary.total_estimated_hours }}h</p>
                          </div>
                          <div class="bg-gray-50 rounded-lg p-4">
                            <p class="text-sm font-medium text-gray-600">Heures réelles</p>
                            <p class="text-xl font-bold text-gray-900">{{ timeSummary.total_hours_logged }}h</p>
                          </div>
                          <div class="bg-gray-50 rounded-lg p-4">
                            <p class="text-sm font-medium text-gray-600">Variance</p>
                            <p class="text-xl font-bold"
                               [class.text-red-600]="timeSummary.variance_percentage > 0"
                               [class.text-green-600]="timeSummary.variance_percentage <= 0">
                              {{ timeSummary.variance_percentage > 0 ? '+' : '' }}{{ timeSummary.variance_percentage | number:'1.1-1' }}%
                            </p>
                          </div>
                          <div class="bg-gray-50 rounded-lg p-4">
                            <p class="text-sm font-medium text-gray-600">Moyenne/jour</p>
                            <p class="text-xl font-bold text-gray-900">{{ timeSummary.average_hours_per_day | number:'1.1-1' }}h</p>
                          </div>
                        </div>

                        <!-- Métriques d'efficacité -->
                        <div class="bg-blue-50 rounded-lg p-4">
                          <h4 class="text-md font-semibold text-gray-900 mb-3">Métriques d'efficacité</h4>
                          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div class="text-center">
                              <p class="text-sm text-gray-600">Planifié vs Réel</p>
                              <p class="text-lg font-bold text-blue-600">{{ timeSummary.efficiency_metrics.planned_vs_actual_ratio | number:'1.2-2' }}</p>
                            </div>
                            <div class="text-center">
                              <p class="text-sm text-gray-600">Score productivité</p>
                              <p class="text-lg font-bold text-blue-600">{{ timeSummary.efficiency_metrics.productivity_score | number:'1.0-0' }}%</p>
                            </div>
                            <div class="text-center">
                              <p class="text-sm text-gray-600">Indicateur qualité</p>
                              <p class="text-lg font-bold text-blue-600">{{ timeSummary.efficiency_metrics.quality_indicator | number:'1.0-0' }}%</p>
                            </div>
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

                    <!-- Entrées de temps récentes -->
                    @if (projectTimeEntries().length > 0) {
                      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <h3 class="text-lg font-semibold text-gray-900 mb-6">Entrées de temps récentes</h3>

                        <div class="space-y-3">
                          @for (entry of projectTimeEntries(); track entry.id) {
                            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div class="flex items-center">
                                <div class="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center mr-3">
                                  <span class="text-xs font-medium text-white">
                                    {{ entry.user?.name?.substring(0, 2)?.toUpperCase() || 'XX' }}
                                  </span>
                                </div>
                                <div>
                                  <p class="text-sm font-medium text-gray-900">{{ entry.user?.name || 'Utilisateur inconnu' }}</p>
                                  <p class="text-xs text-gray-600">
                                    {{ entry.task?.title || 'Tâche générale' }} • {{ formatDate(entry.date) }}
                                  </p>
                                  @if (entry.description) {
                                    <p class="text-xs text-gray-500 mt-1">{{ entry.description }}</p>
                                  }
                                </div>
                              </div>
                              <div class="text-right">
                                <p class="text-sm font-bold text-indigo-600">{{ entry.hours }}h</p>
                                @if (entry.billable) {
                                  <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                    Facturable
                                  </span>
                                } @else {
                                  <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                    Non facturable
                                  </span>
                                }
                              </div>
                            </div>
                          }
                        </div>

                        <div class="mt-4 text-center">
                          <button class="text-sm text-blue-600 hover:text-blue-800 font-medium">
                            Voir toutes les entrées de temps
                          </button>
                        </div>
                      </div>
                    }

                    @if (!projectStats() && !projectTimeSummary() && !projectTimeline().length && !projectTimeEntries().length) {
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

            <!-- Sidebar (1/3) -->
            <div class="space-y-6">

              <!-- Informations du projet -->
              <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">Informations</h3>
                <dl class="space-y-4">
                  <div>
                    <dt class="text-sm font-medium text-gray-500">Code projet</dt>
                    <dd class="mt-1 text-sm text-gray-900 font-mono">{{ proj.code }}</dd>
                  </div>
                  @if (proj.client_info || proj.client) {
                    <div>
                      <dt class="text-sm font-medium text-gray-500">Client</dt>
                      <dd class="mt-1 text-sm text-gray-900">
                        @if (proj.client) {
                          {{ proj.client.name || proj.client.getDisplayName?.() || 'N/A' }}
                        } @else if (proj.client_info && proj.client_type === 'externe') {
                          {{ proj.external_client_info?.name }}
                        } @else {
                          N/A
                        }
                      </dd>
                    </div>
                  }
                  @if (proj.project_manager) {
                    <div>
                      <dt class="text-sm font-medium text-gray-500">Chef de projet</dt>
                      <dd class="mt-1 text-sm text-gray-900">{{ proj.project_manager.name || proj.project_manager.getDisplayName?.() || 'Non assigné' }}</dd>
                    </div>
                  }
                  <div>
                    <dt class="text-sm font-medium text-gray-500">Département</dt>
                    <dd class="mt-1 text-sm text-gray-900">{{ proj.department }}</dd>
                  </div>
                  <div>
                    <dt class="text-sm font-medium text-gray-500">Date de création</dt>
                    <dd class="mt-1 text-sm text-gray-900">{{ formatDate(proj.created_at) }}</dd>
                  </div>
                  @if (proj.start_date) {
                    <div>
                      <dt class="text-sm font-medium text-gray-500">Date de début</dt>
                      <dd class="mt-1 text-sm text-gray-900">{{ formatDate(proj.start_date) }}</dd>
                    </div>
                  }
                  @if (proj.planned_end_date) {
                    <div>
                      <dt class="text-sm font-medium text-gray-500">Date de fin prévue</dt>
                      <dd class="mt-1 text-sm text-gray-900">{{ formatDate(proj.planned_end_date) }}</dd>
                    </div>
                  }
                  @if (proj.actual_end_date) {
                    <div>
                      <dt class="text-sm font-medium text-gray-500">Date de fin réelle</dt>
                      <dd class="mt-1 text-sm text-gray-900">{{ formatDate(proj.actual_end_date) }}</dd>
                    </div>
                  }
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

              <!-- Activité récente -->
              <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">Historique récent</h3>
                <div class="space-y-4">
                  @if (projectHistory().length > 0) {
                    @for (history of projectHistory(); track history.id) {
                      <div class="flex items-start space-x-3">
                        <div class="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                        <div class="flex-1 min-w-0">
                          <p class="text-sm text-gray-700">
                            <span class="font-medium">{{ history.changed_by_user?.name || 'Système' }}</span>
                            {{ getHistoryActionDescription(history) }}
                          </p>
                          <p class="text-xs text-gray-500">{{ formatDate(history.created_at) }}</p>
                          @if (history.comment) {
                            <p class="text-xs text-gray-600 mt-1 italic">{{ history.comment }}</p>
                          }
                        </div>
                      </div>
                    }
                  } @else {
                    <p class="text-sm text-gray-500 text-center py-4">Aucun historique disponible</p>
                  }
                </div>
              </div>

              <!-- Actions rapides -->
              <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h3>
                <div class="space-y-2">
                  <button
                    (click)="createTask()"
                    class="w-full flex items-center justify-start px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0 0h6m-6 0H6"/>
                    </svg>
                    Créer une tâche
                  </button>
                  <button
                    (click)="addTeamMember()"
                    class="w-full flex items-center justify-start px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/>
                    </svg>
                    Ajouter un membre
                  </button>
                  <button
                    (click)="updateProgress()"
                    class="w-full flex items-center justify-start px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                    </svg>
                    Mettre à jour la progression
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
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
  private destroy$ = new Subject<void>();

  // Signals pour l'état du composant
  project = signal<Project | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  recentTasks = signal<Task[]>([]);
  showDropdown = signal(false);
  activeTab = signal<string>('overview');
  isFavorite = signal(false);

  // Signals pour les analytics
  projectTimeline = signal<ProjectTimeline[]>([]);
  projectStats = signal<ProjectStats | null>(null);
  projectTimeSummary = signal<ProjectTimeSummary | null>(null);
  projectTimeAnalytics = signal<ProjectTimeAnalytics | null>(null);
  projectTimeEntries = signal<any[]>([]);
  projectHistory = signal<any[]>([]);
  projectProgress = signal<any>(null);
  projectComments = signal<any[]>([]);
  analyticsLoading = signal(false);

  // Variables pour les filtres et recherche
  taskSearchQuery = '';
  taskStatusFilter = '';
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
      id: 'tasks',
      label: 'Tâches',
      icon: 'M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
      badge: this.recentTasks().length
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

    this.projectsApiService.getProject(this.projectId).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.loading.set(false)),
      catchError(error => {
        this.error.set('Erreur lors du chargement du projet');
        console.error('Erreur lors du chargement du projet:', error);
        return of(null);
      })
    ).subscribe(project => {
      if (project) {
        this.project.set(project);
        this.loadProjectTasks();
        this.loadProjectHistory();
      }
    });
  }

  private loadProjectTasks(): void {
    // Charger les tâches via l'API uniquement
    this.projectsApiService.getProjectTasks(this.projectId, { limit: 10 }).pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.error('Erreur lors du chargement des tâches:', error);
        // Retourner un tableau vide en cas d'erreur
        return of([]);
      })
    ).subscribe(tasks => {
      this.recentTasks.set(Array.isArray(tasks) ? tasks : []);
    });
  }

  private loadProjectHistory(): void {
    this.projectsApiService.getProjectHistory(this.projectId, 5).pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.error('Erreur lors du chargement de l\'historique:', error);
        return of(null);
      })
    ).subscribe(response => {
      if (response?.data) {
        this.projectHistory.set(response.data);
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
    // TODO: Ouvrir un modal d'édition ou une page d'édition avec formulaire
    // Pour l'instant, cette action est en attente d'interface utilisateur
    console.log('Fonctionnalité d\'édition de projet nécessite un formulaire d\'édition');
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
        return history.filter(h => h.action_type === 'comment' || h.comment);
      }),
      catchError(error => {
        console.error('Erreur lors du chargement des commentaires:', error);
        return of([]);
      })
    ).subscribe(comments => {
      this.projectComments.set(comments);
    });
  }

  // Actions des tâches
  filterTasks(): void {
    // TODO: Implémenter le filtrage des tâches
    console.log('Filtrer les tâches', this.taskSearchQuery, this.taskStatusFilter);
  }

  createTask(): void {
    // TODO: Ouvrir un modal de création de tâche
    console.log('Créer une nouvelle tâche');
  }

  editTask(task: Task): void {
    // TODO: Ouvrir un modal d'édition de tâche
    console.log('Éditer la tâche', task);
  }

  // Actions de l'équipe
  addTeamMember(): void {
    // TODO: Ouvrir un modal d'ajout de membre avec sélection d'utilisateur
    // Pour l'instant, cette action est en attente d'interface utilisateur
    console.log('Fonctionnalité d\'ajout de membre nécessite un modal de sélection');
  }

  editTeamMember(member: ProjectTeamMember): void {
    // TODO: Ouvrir un modal d'édition de membre avec formulaire
    // Pour l'instant, cette action est en attente d'interface utilisateur
    console.log('Fonctionnalité d\'édition de membre nécessite un modal de modification', member);
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

    this.projectsApiService.updateProjectStatus(this.projectId, statusData).pipe(
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
    const timeSummary$ = this.projectsApiService.getProjectTimeSummary(this.projectId);
    const timeAnalytics$ = this.projectsApiService.getProjectTimeAnalytics(this.projectId);
    const timeEntries$ = this.projectsApiService.getProjectTimeEntries(this.projectId);

    // Timeline
    timeline$.pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.error('Erreur lors du chargement de la timeline:', error);
        return of(null);
      })
    ).subscribe(response => {
      if (response?.data) {
        this.projectTimeline.set(response.data);
      }
    });

    // Stats
    stats$.pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.error('Erreur lors du chargement des stats:', error);
        return of(null);
      })
    ).subscribe(response => {
      if (response?.data) {
        this.projectStats.set(response.data);
      }
    });

    // Time Summary
    timeSummary$.pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.error('Erreur lors du chargement du résumé temporel:', error);
        return of(null);
      })
    ).subscribe(response => {
      if (response?.data) {
        this.projectTimeSummary.set(response.data);
      }
    });

    // Time Analytics
    timeAnalytics$.pipe(
      takeUntil(this.destroy$),
      catchError(error => {
        console.error('Erreur lors du chargement des analytics temporels:', error);
        return of(null);
      })
    ).subscribe(response => {
      if (response?.data) {
        this.projectTimeAnalytics.set(response.data);
      }
    });

    // Time Entries
    timeEntries$.pipe(
      takeUntil(this.destroy$),
      finalize(() => this.analyticsLoading.set(false)),
      catchError(error => {
        console.error('Erreur lors du chargement des entrées de temps:', error);
        return of(null);
      })
    ).subscribe(response => {
      if (response?.data) {
        this.projectTimeEntries.set(response.data);
      }
    });
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

  getTaskStatusLabel(status: string): string {
    switch (status) {
      case 'en_cours': return 'En cours';
      case 'en_attente': return 'En attente';
      case 'en_danger': return 'En danger';
      case 'termine': return 'Terminé';
      case 'annule': return 'Annulé';
      default: return status;
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

}