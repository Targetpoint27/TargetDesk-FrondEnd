// ========================================
// COMPOSANT DÉTAILS D'UNE TÂCHE
// Interface complète avec tous les éléments de l'API
// ========================================

import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil, switchMap, of, finalize } from 'rxjs';

import { TasksApiService } from '../../services/tasks-api.service';
import { TimeTrackingApiService } from '../../../time-tracking/services/time-tracking-api.service';
import {
  Task,
  TaskComment,
  TaskFile,
  TaskTimeEntry,
  TaskDifficulty,
  TaskStatus,
  TaskPriority,
  CreateCommentRequest,
  CreateTimeEntryRequest,
  CreateDifficultyRequest,
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  DIFFICULTY_TYPE_LABELS,
  DIFFICULTY_SEVERITY_LABELS
} from '../../models/task.models';

@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">

      @if (loading()) {
        <!-- État de chargement -->
        <div class="flex items-center justify-center min-h-screen">
          <div class="text-center">
            <div class="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-blue-500 bg-blue-100">
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Chargement de la tâche...
            </div>
          </div>
        </div>
      } @else if (error()) {
        <!-- État d'erreur -->
        <div class="flex items-center justify-center min-h-screen">
          <div class="text-center">
            <svg class="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <h3 class="mt-2 text-sm font-medium text-red-800">Tâche introuvable</h3>
            <p class="mt-1 text-sm text-red-600">{{ error() }}</p>
            <button
              (click)="goBack()"
              class="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              Retour à la liste
            </button>
          </div>
        </div>
      } @else if (task()) {
        <!-- Contenu principal -->

        <!-- Header avec navigation -->
        <div class="bg-white shadow-sm border-b border-gray-200">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex items-center justify-between h-16">
              <div class="flex items-center space-x-4">
                <button
                  (click)="goBack()"
                  class="flex items-center text-gray-600 hover:text-blue-600 transition-colors"
                >
                  <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                  </svg>
                  Retour
                </button>
                <div>
                  <h1 class="text-xl font-bold text-gray-900">{{ task()?.title }}</h1>
                  <p class="text-sm text-gray-500 font-mono">{{ task()?.code }}</p>
                </div>
              </div>

              <div class="flex items-center space-x-3">
                <!-- Timer -->
                @if (currentSession()) {
                  <div class="flex items-center space-x-2 bg-green-100 text-green-800 px-3 py-1.5 rounded-lg">
                    <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span class="text-sm font-medium">{{ formatElapsedTime(currentSessionElapsed()) }}</span>
                    <button
                      (click)="stopTimer()"
                      class="ml-2 p-1 hover:bg-green-200 rounded"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10h6v4H9z"/>
                      </svg>
                    </button>
                  </div>
                } @else {
                  <button
                    (click)="startTimer()"
                    class="inline-flex items-center px-3 py-1.5 border border-green-300 rounded-lg text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100"
                  >
                    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    Démarrer
                  </button>
                }

                <!-- Actions -->
                <div class="relative">
                  <button
                    (click)="showActionsMenu = !showActionsMenu"
                    class="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Actions
                    <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                    </svg>
                  </button>

                  @if (showActionsMenu) {
                    <div class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                      <div class="py-1">
                        <button
                          (click)="editTask(); showActionsMenu = false"
                          class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Modifier la tâche
                        </button>
                        <button
                          (click)="duplicateTask(); showActionsMenu = false"
                          class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Dupliquer
                        </button>
                        <button
                          (click)="showAssignModal = true; showActionsMenu = false"
                          class="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Assigner
                        </button>
                        <hr class="my-1">
                        <button
                          (click)="deleteTask(); showActionsMenu = false"
                          class="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Contenu avec onglets -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

            <!-- Colonne principale -->
            <div class="lg:col-span-2 space-y-6">

              <!-- Informations principales -->
              <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div class="flex items-start justify-between mb-4">
                  <h2 class="text-lg font-semibold text-gray-900">Informations</h2>

                  <!-- Progression -->
                  @if (task()!.progress_percentage > 0) {
                    <div class="flex flex-col items-center">
                      <div class="w-16 h-16 relative">
                        <svg class="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                          <path
                            class="text-gray-200"
                            stroke="currentColor"
                            stroke-width="3"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          <path
                            [attr.stroke]="getTaskProgressColor(task()!.progress_percentage)"
                            stroke-width="3"
                            stroke-linecap="round"
                            fill="none"
                            [attr.stroke-dasharray]="task()!.progress_percentage + ' ' + (100 - task()!.progress_percentage)"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                        </svg>
                        <div class="absolute inset-0 flex items-center justify-center">
                          <span class="text-sm font-semibold">{{ task()!.progress_percentage }}%</span>
                        </div>
                      </div>
                      <span class="text-xs text-gray-500 mt-1">Progression</span>
                    </div>
                  }
                </div>

                @if (task()!.description) {
                  <div class="mb-6">
                    <h3 class="text-sm font-medium text-gray-700 mb-2">Description</h3>
                    <p class="text-gray-600 whitespace-pre-wrap">{{ task()!.description }}</p>
                  </div>
                }

                <!-- Métadonnées -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label class="block text-xs font-medium text-gray-500 mb-1">Statut</label>
                    <select
                      [(ngModel)]="task()!.status"
                      (ngModelChange)="updateTaskStatus($event)"
                      class="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      @for (status of taskStatuses; track status.value) {
                        <option [value]="status.value">{{ status.label }}</option>
                      }
                    </select>
                  </div>

                  <div>
                    <label class="block text-xs font-medium text-gray-500 mb-1">Priorité</label>
                    <select
                      [(ngModel)]="task()!.priority"
                      (ngModelChange)="updateTaskPriority($event)"
                      class="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      @for (priority of taskPriorities; track priority.value) {
                        <option [value]="priority.value">{{ priority.label }}</option>
                      }
                    </select>
                  </div>

                  @if (task()!.due_date) {
                    <div>
                      <label class="block text-xs font-medium text-gray-500 mb-1">Échéance</label>
                      <p class="text-sm text-gray-900" [class.text-red-600]="isTaskOverdue(task()!)">
                        {{ formatDate(task()!.due_date) }}
                        @if (isTaskOverdue(task()!)) {
                          <span class="text-xs">(En retard)</span>
                        }
                      </p>
                    </div>
                  }

                  @if (task()!.estimated_hours || task()!.actual_hours) {
                    <div>
                      <label class="block text-xs font-medium text-gray-500 mb-1">Temps</label>
                      <div class="text-sm text-gray-900">
                        @if (task()!.actual_hours) {
                          <span class="font-medium">{{ formatDuration(task()!.actual_hours) }}</span>
                          @if (task()!.estimated_hours) {
                            <span class="text-gray-500">/ {{ formatDuration(task()!.estimated_hours) }}</span>
                          }
                        } @else if (task()!.estimated_hours) {
                          <span>{{ formatDuration(task()!.estimated_hours) }} estimé</span>
                        }
                      </div>
                    </div>
                  }
                </div>

                <!-- Assignés -->
                @if (task()!.assignees && task()!.assignees.length > 0) {
                  <div class="mt-4">
                    <label class="block text-xs font-medium text-gray-500 mb-2">Assigné à</label>
                    <div class="flex flex-wrap gap-2">
                      @for (assignment of task()!.assignees; track assignment.user_id) {
                        <div class="flex items-center space-x-2 bg-gray-100 px-3 py-1 rounded-full">
                          <div class="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                            {{ assignment.user.name.charAt(0).toUpperCase() }}
                          </div>
                          <span class="text-sm text-gray-700">{{ assignment.user.name }}</span>
                        </div>
                      }
                    </div>
                  </div>
                }

                <!-- Tags -->
                @if (task()!.tags && task()!.tags.length > 0) {
                  <div class="mt-4">
                    <label class="block text-xs font-medium text-gray-500 mb-2">Étiquettes</label>
                    <div class="flex flex-wrap gap-2">
                      @for (tag of task()!.tags; track tag.id) {
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white" [style.background-color]="tag.color">
                          {{ tag.name }}
                        </span>
                      }
                    </div>
                  </div>
                }
              </div>

              <!-- Onglets -->
              <div class="bg-white rounded-xl shadow-sm border border-gray-200">
                <div class="border-b border-gray-200">
                  <nav class="-mb-px flex space-x-8 px-6">
                    <button
                      (click)="activeTab.set('comments')"
                      [class.border-blue-500]="activeTab() === 'comments'"
                      [class.text-blue-600]="activeTab() === 'comments'"
                      [class.border-transparent]="activeTab() !== 'comments'"
                      [class.text-gray-500]="activeTab() !== 'comments'"
                      class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm hover:text-gray-700 hover:border-gray-300"
                    >
                      Commentaires
                      @if (task()!.comments_count) {
                        <span class="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                          {{ task()!.comments_count }}
                        </span>
                      }
                    </button>

                    <button
                      (click)="activeTab.set('files')"
                      [class.border-blue-500]="activeTab() === 'files'"
                      [class.text-blue-600]="activeTab() === 'files'"
                      [class.border-transparent]="activeTab() !== 'files'"
                      [class.text-gray-500]="activeTab() !== 'files'"
                      class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm hover:text-gray-700 hover:border-gray-300"
                    >
                      Fichiers
                      @if (task()!.files_count) {
                        <span class="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                          {{ task()!.files_count }}
                        </span>
                      }
                    </button>

                    <button
                      (click)="activeTab.set('time'); loadTimeEntries()"
                      [class.border-blue-500]="activeTab() === 'time'"
                      [class.text-blue-600]="activeTab() === 'time'"
                      [class.border-transparent]="activeTab() !== 'time'"
                      [class.text-gray-500]="activeTab() !== 'time'"
                      class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm hover:text-gray-700 hover:border-gray-300"
                    >
                      Temps
                      @if (task()!.time_entries_count) {
                        <span class="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                          {{ task()!.time_entries_count }}
                        </span>
                      }
                    </button>

                    <button
                      (click)="activeTab.set('difficulties'); loadDifficulties()"
                      [class.border-blue-500]="activeTab() === 'difficulties'"
                      [class.text-blue-600]="activeTab() === 'difficulties'"
                      [class.border-transparent]="activeTab() !== 'difficulties'"
                      [class.text-gray-500]="activeTab() !== 'difficulties'"
                      class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm hover:text-gray-700 hover:border-gray-300"
                    >
                      Difficultés
                      @if (task()!.difficulties_count && task()!.difficulties_count > 0) {
                        <span class="ml-2 bg-red-100 text-red-900 py-0.5 px-2.5 rounded-full text-xs">
                          {{ task()!.difficulties_count }}
                        </span>
                      }
                    </button>

                    <button
                      (click)="activeTab.set('history'); loadHistory()"
                      [class.border-blue-500]="activeTab() === 'history'"
                      [class.text-blue-600]="activeTab() === 'history'"
                      [class.border-transparent]="activeTab() !== 'history'"
                      [class.text-gray-500]="activeTab() !== 'history'"
                      class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm hover:text-gray-700 hover:border-gray-300"
                    >
                      Historique
                    </button>
                  </nav>
                </div>

                <div class="p-6">
                  <!-- Onglet Commentaires -->
                  @if (activeTab() === 'comments') {
                    <div class="space-y-6">

                      <!-- Nouveau commentaire -->
                      <form [formGroup]="commentForm" (ngSubmit)="addComment()">
                        <div class="space-y-3">
                          <textarea
                            formControlName="content"
                            rows="3"
                            placeholder="Ajouter un commentaire..."
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          ></textarea>
                          <div class="flex items-center justify-between">
                            <p class="text-xs text-gray-500">
                              Utilisez @ pour mentionner un utilisateur
                            </p>
                            <button
                              type="submit"
                              [disabled]="commentForm.invalid || submittingComment()"
                              class="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              @if (submittingComment()) {
                                <svg class="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              }
                              Commenter
                            </button>
                          </div>
                        </div>
                      </form>

                      <!-- Liste des commentaires -->
                      <div class="space-y-4">
                        @for (comment of comments(); track comment.id) {
                          <div class="flex space-x-3">
                            <div class="flex-shrink-0">
                              <div class="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                {{ comment.user.name.charAt(0).toUpperCase() }}
                              </div>
                            </div>
                            <div class="flex-1 min-w-0">
                              <div class="bg-gray-50 rounded-lg px-4 py-3">
                                <div class="flex items-center justify-between mb-1">
                                  <p class="text-sm font-medium text-gray-900">{{ comment.user.name }}</p>
                                  <p class="text-xs text-gray-500">{{ formatDate(comment.created_at) }}</p>
                                </div>
                                <p class="text-sm text-gray-700 whitespace-pre-wrap">{{ comment.content }}</p>
                              </div>
                            </div>
                          </div>
                        }
                      </div>
                    </div>
                  }

                  <!-- Onglet Fichiers -->
                  @if (activeTab() === 'files') {
                    <div class="space-y-6">

                      <!-- Zone de téléchargement -->
                      <div class="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                        <svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <h3 class="mt-2 text-sm font-medium text-gray-900">Glissez-déposez vos fichiers ici</h3>
                        <p class="mt-1 text-sm text-gray-500">ou cliquez pour sélectionner des fichiers</p>
                        <input
                          #fileInput
                          type="file"
                          multiple
                          (change)="onFileSelected($event)"
                          class="hidden"
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.zip"
                        />
                        <button
                          (click)="fileInput.click()"
                          class="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                        >
                          Sélectionner des fichiers
                        </button>
                      </div>

                      <!-- Liste des fichiers -->
                      <div class="space-y-3">
                        @for (file of files(); track file.id) {
                          <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div class="flex items-center space-x-3">
                              <div class="flex-shrink-0">
                                <svg class="h-8 w-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                                  <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/>
                                </svg>
                              </div>
                              <div>
                                <p class="text-sm font-medium text-gray-900">{{ file.name }}</p>
                                <p class="text-sm text-gray-500">{{ file.file_size_human }} • {{ file.user.name }}</p>
                              </div>
                            </div>
                            <div class="flex items-center space-x-2">
                              <a
                                [href]="getFileDownloadUrl(file.id)"
                                target="_blank"
                                class="p-1 text-gray-400 hover:text-blue-600"
                                title="Télécharger"
                              >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                </svg>
                              </a>
                              <button
                                (click)="deleteFile(file.id)"
                                class="p-1 text-gray-400 hover:text-red-600"
                                title="Supprimer"
                              >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                </svg>
                              </button>
                            </div>
                          </div>
                        }
                      </div>
                    </div>
                  }

                  <!-- Onglet Temps -->
                  @if (activeTab() === 'time') {
                    <div class="space-y-6">

                      <!-- Formulaire saisie manuelle -->
                      <div class="bg-gray-50 rounded-lg p-4">
                        <h3 class="text-sm font-medium text-gray-900 mb-3">Saisir du temps manuellement</h3>
                        <form [formGroup]="timeEntryForm" (ngSubmit)="addTimeEntry()" class="grid grid-cols-1 md:grid-cols-4 gap-3">
                          <input
                            formControlName="date"
                            type="date"
                            class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          />
                          <input
                            formControlName="hours"
                            type="number"
                            step="0.25"
                            placeholder="Heures"
                            class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          />
                          <input
                            formControlName="description"
                            type="text"
                            placeholder="Description (optionnel)"
                            class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          />
                          <button
                            type="submit"
                            [disabled]="timeEntryForm.invalid || submittingTime()"
                            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                          >
                            Ajouter
                          </button>
                        </form>
                      </div>

                      <!-- Historique des saisies -->
                      <div class="space-y-3">
                        @for (entry of timeEntries(); track entry.id) {
                          <div class="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                            <div class="flex items-center space-x-4">
                              <div class="text-sm text-gray-900">
                                <p class="font-medium">{{ formatDuration(entry.hours) }}</p>
                                <p class="text-gray-500">{{ formatDate(entry.start_time) }}</p>
                              </div>
                              @if (entry.description) {
                                <p class="text-sm text-gray-600">{{ entry.description }}</p>
                              }
                            </div>
                            <div class="flex items-center space-x-2">
                              <span class="text-sm text-gray-500">{{ entry.user?.name }}</span>
                              <button
                                (click)="deleteTimeEntry(entry.id)"
                                class="p-1 text-gray-400 hover:text-red-600"
                                title="Supprimer"
                              >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                </svg>
                              </button>
                            </div>
                          </div>
                        }
                      </div>
                    </div>
                  }

                  <!-- Onglet Difficultés -->
                  @if (activeTab() === 'difficulties') {
                    <div class="space-y-6">

                      <!-- Formulaire nouvelle difficulté -->
                      <div class="bg-red-50 rounded-lg p-4 border border-red-200">
                        <h3 class="text-sm font-medium text-red-900 mb-3">Signaler une difficulté</h3>
                        <form [formGroup]="difficultyForm" (ngSubmit)="reportDifficulty()" class="space-y-3">
                          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <select
                              formControlName="type"
                              class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            >
                              <option value="">Type de difficulté</option>
                              @for (type of difficultyTypes; track type.value) {
                                <option [value]="type.value">{{ type.label }}</option>
                              }
                            </select>
                            <select
                              formControlName="severity"
                              class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            >
                              <option value="">Gravité</option>
                              @for (severity of difficultySeverities; track severity.value) {
                                <option [value]="severity.value">{{ severity.label }}</option>
                              }
                            </select>
                          </div>
                          <textarea
                            formControlName="description"
                            rows="3"
                            placeholder="Décrivez la difficulté rencontrée..."
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          ></textarea>
                          <textarea
                            formControlName="proposed_solution"
                            rows="2"
                            placeholder="Solution proposée (optionnel)"
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          ></textarea>
                          <button
                            type="submit"
                            [disabled]="difficultyForm.invalid || submittingDifficulty()"
                            class="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Signaler la difficulté
                          </button>
                        </form>
                      </div>

                      <!-- Liste des difficultés -->
                      <div class="space-y-3">
                        @for (difficulty of difficulties(); track difficulty.id) {
                          <div class="p-4 border border-gray-200 rounded-lg" [class.bg-red-50]="difficulty.status === 'open'" [class.bg-green-50]="difficulty.status === 'resolved'">
                            <div class="flex items-start justify-between mb-2">
                              <div class="flex items-center space-x-2">
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" [class.bg-red-100]="difficulty.status === 'open'" [class.text-red-800]="difficulty.status === 'open'" [class.bg-green-100]="difficulty.status === 'resolved'" [class.text-green-800]="difficulty.status === 'resolved'">
                                  {{ difficulty.status === 'open' ? 'Ouverte' : 'Résolue' }}
                                </span>
                                <span class="text-xs text-gray-500">{{ getDifficultyTypeLabel(difficulty.type) }} • {{ getDifficultySeverityLabel(difficulty.severity) }}</span>
                              </div>
                              <span class="text-xs text-gray-500">{{ difficulty.user.name }} • {{ formatDate(difficulty.created_at) }}</span>
                            </div>
                            <p class="text-sm text-gray-900 mb-2">{{ difficulty.description }}</p>
                            @if (difficulty.proposed_solution) {
                              <p class="text-sm text-blue-600"><strong>Solution proposée :</strong> {{ difficulty.proposed_solution }}</p>
                            }
                            @if (difficulty.resolution && difficulty.status === 'resolved') {
                              <div class="mt-3 pt-3 border-t border-gray-200">
                                <p class="text-sm text-green-700"><strong>Résolution :</strong> {{ difficulty.resolution }}</p>
                                @if (difficulty.resolver) {
                                  <p class="text-xs text-gray-500 mt-1">Résolu par {{ difficulty.resolver.name }} le {{ formatDate(difficulty.resolved_at!) }}</p>
                                }
                              </div>
                            }
                          </div>
                        }
                      </div>
                    </div>
                  }

                  <!-- Onglet Historique -->
                  @if (activeTab() === 'history') {
                    <div class="space-y-3">
                      @for (historyItem of history(); track historyItem.id) {
                        <div class="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                          <div class="flex-shrink-0">
                            <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                              {{ historyItem.user.name.charAt(0).toUpperCase() }}
                            </div>
                          </div>
                          <div class="flex-1">
                            <p class="text-sm text-gray-900">
                              <strong>{{ historyItem.user.name }}</strong>
                              {{ getHistoryActionLabel(historyItem.action) }}
                              @if (historyItem.field_name) {
                                <em>{{ historyItem.field_name }}</em>
                              }
                              @if (historyItem.old_value && historyItem.new_value) {
                                de <span class="font-mono text-xs">{{ historyItem.old_value }}</span>
                                à <span class="font-mono text-xs">{{ historyItem.new_value }}</span>
                              }
                            </p>
                            <p class="text-xs text-gray-500 mt-1">{{ formatDate(historyItem.created_at) }}</p>
                          </div>
                        </div>
                      }
                    </div>
                  }
                </div>
              </div>
            </div>

            <!-- Sidebar -->
            <div class="space-y-6">

              <!-- Informations du projet -->
              @if (task()!.project) {
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 class="text-sm font-medium text-gray-900 mb-3">Projet</h3>
                  <div class="space-y-2">
                    <h4 class="text-lg font-semibold text-gray-900">{{ task()!.project!.name }}</h4>
                    <p class="text-sm text-gray-500">{{ task()!.project!.code }}</p>
                    <button
                      (click)="viewProject(task()!.project_id)"
                      class="inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
                    >
                      Voir le projet
                      <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                      </svg>
                    </button>
                  </div>
                </div>
              }

              <!-- Résumé temps -->
              <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 class="text-sm font-medium text-gray-900 mb-3">Résumé temps</h3>
                <div class="space-y-3">
                  @if (task()!.estimated_hours) {
                    <div class="flex items-center justify-between">
                      <span class="text-sm text-gray-500">Estimé</span>
                      <span class="text-sm font-medium text-gray-900">{{ formatDuration(task()!.estimated_hours) }}</span>
                    </div>
                  }
                  @if (task()!.actual_hours) {
                    <div class="flex items-center justify-between">
                      <span class="text-sm text-gray-500">Réel</span>
                      <span class="text-sm font-medium" [class.text-red-600]="task()!.actual_hours > (task()!.estimated_hours || 0)" [class.text-gray-900]="task()!.actual_hours <= (task()!.estimated_hours || Number.POSITIVE_INFINITY)">
                        {{ formatDuration(task()!.actual_hours) }}
                      </span>
                    </div>
                  }
                  @if (task()!.estimated_hours && task()!.actual_hours) {
                    <div class="flex items-center justify-between pt-2 border-t border-gray-200">
                      <span class="text-sm text-gray-500">Écart</span>
                      <span class="text-sm font-medium" [class.text-red-600]="task()!.actual_hours > task()!.estimated_hours" [class.text-green-600]="task()!.actual_hours <= task()!.estimated_hours">
                        {{ task()!.actual_hours > task()!.estimated_hours ? '+' : '' }}{{ formatDuration(task()!.actual_hours - task()!.estimated_hours) }}
                      </span>
                    </div>
                  }
                </div>
              </div>

              <!-- Actions rapides -->
              <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 class="text-sm font-medium text-gray-900 mb-3">Actions rapides</h3>
                <div class="space-y-2">
                  <button
                    (click)="duplicateTask()"
                    class="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg class="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                    </svg>
                    Dupliquer la tâche
                  </button>
                  <button
                    (click)="showAssignModal = true"
                    class="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg class="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
                    </svg>
                    Réassigner
                  </button>
                  <button
                    (click)="createSubTask()"
                    class="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg class="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                    </svg>
                    Créer une sous-tâche
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class TaskDetailComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private tasksApiService = inject(TasksApiService);
  private timeTrackingApiService = inject(TimeTrackingApiService);
  private destroy$ = new Subject<void>();

  // État du composant
  task = signal<Task | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  activeTab = signal<string>('comments');

  // État des onglets
  comments = signal<TaskComment[]>([]);
  files = signal<TaskFile[]>([]);
  timeEntries = signal<TaskTimeEntry[]>([]);
  difficulties = signal<TaskDifficulty[]>([]);
  history = signal<any[]>([]);

  // État des soumissions
  submittingComment = signal(false);
  submittingTime = signal(false);
  submittingDifficulty = signal(false);

  // Timer
  currentSession = signal<any>(null);
  currentSessionElapsed = signal(0);
  private timerInterval?: any;

  // UI
  showActionsMenu = false;
  showAssignModal = false;

  // Formulaires
  commentForm: FormGroup;
  timeEntryForm: FormGroup;
  difficultyForm: FormGroup;

  // Données de référence
  taskStatuses = Object.entries(TASK_STATUS_LABELS).map(([value, label]) => ({ value, label }));
  taskPriorities = Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => ({ value, label }));
  difficultyTypes = Object.entries(DIFFICULTY_TYPE_LABELS).map(([value, label]) => ({ value, label }));
  difficultySeverities = Object.entries(DIFFICULTY_SEVERITY_LABELS).map(([value, label]) => ({ value, label }));

  // Constantes pour le template
  TaskStatus = TaskStatus;
  Number = Number;

  constructor() {
    this.commentForm = this.fb.group({
      content: ['', [Validators.required, Validators.minLength(1)]]
    });

    this.timeEntryForm = this.fb.group({
      date: [new Date().toISOString().split('T')[0], Validators.required],
      hours: ['', [Validators.required, Validators.min(0.1), Validators.max(24)]],
      description: ['']
    });

    this.difficultyForm = this.fb.group({
      type: ['', Validators.required],
      severity: ['', Validators.required],
      description: ['', [Validators.required, Validators.minLength(10)]],
      proposed_solution: ['']
    });
  }

  ngOnInit(): void {
    this.route.params
      .pipe(
        takeUntil(this.destroy$),
        switchMap(params => {
          const taskId = +params['id'];
          if (!taskId) {
            this.error.set('ID de tâche invalide');
            return of(null);
          }
          return this.tasksApiService.getTask(taskId, 'project,assignees,tags,comments,files,time_entries,difficulties');
        })
      )
      .subscribe({
        next: (response) => {
          if (response?.data) {
            this.task.set(response.data);
            this.loadComments();
            this.loadFiles();
          } else {
            this.error.set('Tâche non trouvée');
          }
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(error.message || 'Erreur lors du chargement de la tâche');
          this.loading.set(false);
        }
      });

    // Surveiller la session de temps actuelle
    this.timeTrackingApiService.currentSession$
      .pipe(takeUntil(this.destroy$))
      .subscribe(session => {
        this.currentSession.set(session);
        if (session?.is_active) {
          this.startTimerDisplay();
        } else {
          this.stopTimerDisplay();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopTimerDisplay();
  }

  // Navigation
  goBack(): void {
    this.router.navigate(['/dashboard/tasks/list']);
  }

  viewProject(projectId: number): void {
    this.router.navigate(['/dashboard/projects/detail', projectId]);
  }

  // Actions principales
  editTask(): void {
    this.router.navigate(['/dashboard/tasks/detail', this.task()?.id], { queryParams: { mode: 'edit' } });
  }

  deleteTask(): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) {
      return;
    }

    const taskId = this.task()?.id;
    if (!taskId) return;

    this.tasksApiService.deleteTask(taskId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.goBack();
        },
        error: (error) => {
          console.error('Failed to delete task', error);
        }
      });
  }

  duplicateTask(): void {
    // TODO: Implémenter la duplication
    console.log('Duplicate task');
  }

  createSubTask(): void {
    // TODO: Implémenter la création de sous-tâche
    console.log('Create subtask');
  }

  // Mise à jour des champs
  updateTaskStatus(status: TaskStatus): void {
    const taskId = this.task()?.id;
    if (!taskId) return;

    this.tasksApiService.updateTaskStatus(taskId, { status })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.data) {
            this.task.set(response.data);
          }
        },
        error: (error) => {
          console.error('Failed to update task status', error);
        }
      });
  }

  updateTaskPriority(priority: TaskPriority): void {
    const taskId = this.task()?.id;
    if (!taskId) return;

    this.tasksApiService.updateTask(taskId, { priority })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.data) {
            this.task.set(response.data);
          }
        },
        error: (error) => {
          console.error('Failed to update task priority', error);
        }
      });
  }

  // Gestion des commentaires
  loadComments(): void {
    const taskId = this.task()?.id;
    if (!taskId) return;

    this.tasksApiService.getTaskComments(taskId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.comments.set(response.data || []);
        },
        error: (error) => {
          console.error('Failed to load comments', error);
        }
      });
  }

  addComment(): void {
    if (this.commentForm.invalid || this.submittingComment()) return;

    const taskId = this.task()?.id;
    if (!taskId) return;

    this.submittingComment.set(true);

    const commentData: CreateCommentRequest = {
      content: this.commentForm.value.content,
      notify_assignees: true
    };

    this.tasksApiService.addComment(taskId, commentData)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.submittingComment.set(false))
      )
      .subscribe({
        next: () => {
          this.commentForm.reset();
          this.loadComments();
        },
        error: (error) => {
          console.error('Failed to add comment', error);
        }
      });
  }

  // Gestion des fichiers
  loadFiles(): void {
    const taskId = this.task()?.id;
    if (!taskId) return;

    this.tasksApiService.getTaskFiles(taskId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.files.set(response.data || []);
        },
        error: (error) => {
          console.error('Failed to load files', error);
        }
      });
  }

  onFileSelected(event: any): void {
    const files = event.target.files;
    if (!files?.length) return;

    const taskId = this.task()?.id;
    if (!taskId) return;

    Array.from(files).forEach((file: any) => {
      this.tasksApiService.uploadFile(taskId, file)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadFiles();
          },
          error: (error) => {
            console.error('Failed to upload file', error);
          }
        });
    });

    // Reset input
    event.target.value = '';
  }

  getFileDownloadUrl(fileId: number): string {
    return this.tasksApiService.getFileDownloadUrl(fileId);
  }

  deleteFile(fileId: number): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce fichier ?')) return;

    this.tasksApiService.deleteFile(fileId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadFiles();
        },
        error: (error) => {
          console.error('Failed to delete file', error);
        }
      });
  }

  // Gestion du temps
  loadTimeEntries(): void {
    const taskId = this.task()?.id;
    if (!taskId) return;

    this.tasksApiService.getTaskTimeEntries(taskId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.timeEntries.set(response.data || []);
        },
        error: (error) => {
          console.error('Failed to load time entries', error);
        }
      });
  }

  startTimer(): void {
    const taskId = this.task()?.id;
    if (!taskId) return;

    this.timeTrackingApiService.startSession(taskId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Session mise à jour via l'observable
        },
        error: (error) => {
          console.error('Failed to start timer', error);
        }
      });
  }

  stopTimer(): void {
    const session = this.currentSession();
    if (!session?.id) return;

    this.timeTrackingApiService.stopSession(session.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Session mise à jour via l'observable
          this.loadTimeEntries();
        },
        error: (error) => {
          console.error('Failed to stop timer', error);
        }
      });
  }

  private startTimerDisplay(): void {
    this.stopTimerDisplay();
    this.timerInterval = setInterval(() => {
      const currentValue = this.currentSessionElapsed();
      this.currentSessionElapsed.set(currentValue + 1);
    }, 1000);
  }

  private stopTimerDisplay(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = undefined;
    }
    this.currentSessionElapsed.set(0);
  }

  addTimeEntry(): void {
    if (this.timeEntryForm.invalid || this.submittingTime()) return;

    const taskId = this.task()?.id;
    if (!taskId) return;

    this.submittingTime.set(true);

    const timeData: CreateTimeEntryRequest = this.timeEntryForm.value;

    this.tasksApiService.addTimeEntry(taskId, timeData)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.submittingTime.set(false))
      )
      .subscribe({
        next: () => {
          this.timeEntryForm.patchValue({
            date: new Date().toISOString().split('T')[0],
            hours: '',
            description: ''
          });
          this.loadTimeEntries();
        },
        error: (error) => {
          console.error('Failed to add time entry', error);
        }
      });
  }

  deleteTimeEntry(entryId: number): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette saisie de temps ?')) return;

    this.tasksApiService.deleteTimeEntry(entryId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadTimeEntries();
        },
        error: (error) => {
          console.error('Failed to delete time entry', error);
        }
      });
  }

  // Gestion des difficultés
  loadDifficulties(): void {
    const taskId = this.task()?.id;
    if (!taskId) return;

    this.tasksApiService.getTaskDifficulties(taskId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.difficulties.set(response.data || []);
        },
        error: (error) => {
          console.error('Failed to load difficulties', error);
        }
      });
  }

  reportDifficulty(): void {
    if (this.difficultyForm.invalid || this.submittingDifficulty()) return;

    const taskId = this.task()?.id;
    if (!taskId) return;

    this.submittingDifficulty.set(true);

    const difficultyData: CreateDifficultyRequest = this.difficultyForm.value;

    this.tasksApiService.reportDifficulty(taskId, difficultyData)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.submittingDifficulty.set(false))
      )
      .subscribe({
        next: () => {
          this.difficultyForm.reset();
          this.loadDifficulties();
        },
        error: (error) => {
          console.error('Failed to report difficulty', error);
        }
      });
  }

  // Historique
  loadHistory(): void {
    const taskId = this.task()?.id;
    if (!taskId) return;

    this.tasksApiService.getTaskHistory(taskId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.history.set(response.data || []);
        },
        error: (error) => {
          console.error('Failed to load history', error);
        }
      });
  }

  // Méthodes utilitaires
  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDuration(hours: number): string {
    if (hours < 1) {
      return `${Math.round(hours * 60)}min`;
    }
    return `${hours.toFixed(1)}h`;
  }

  formatElapsedTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  }

  isTaskOverdue(task: Task): boolean {
    if (!task.due_date) return false;
    const today = new Date();
    const dueDate = new Date(task.due_date);
    return today > dueDate && task.status !== TaskStatus.TERMINE;
  }

  getTaskProgressColor(percentage: number): string {
    if (percentage >= 80) return '#10b981';
    if (percentage >= 60) return '#3b82f6';
    if (percentage >= 40) return '#f59e0b';
    return '#ef4444';
  }

  getDifficultyTypeLabel(type: string): string {
    return DIFFICULTY_TYPE_LABELS[type as keyof typeof DIFFICULTY_TYPE_LABELS] || type;
  }

  getDifficultySeverityLabel(severity: string): string {
    return DIFFICULTY_SEVERITY_LABELS[severity as keyof typeof DIFFICULTY_SEVERITY_LABELS] || severity;
  }

  getHistoryActionLabel(action: string): string {
    const labels: { [key: string]: string } = {
      'status_changed': 'a modifié le statut',
      'priority_changed': 'a modifié la priorité',
      'assigned': 'a assigné la tâche',
      'comment_added': 'a ajouté un commentaire',
      'file_added': 'a ajouté un fichier',
      'time_added': 'a ajouté du temps'
    };
    return labels[action] || action;
  }
}