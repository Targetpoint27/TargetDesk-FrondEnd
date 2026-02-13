// ========================================
// COMPOSANT PANNEAU DE DÉTAILS DE TÂCHE
// Panel qui s'ouvre de droite à gauche avec animation slide
// ========================================

import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { Task, TaskComment, TaskFile, TaskTimeEntry, TaskDifficulty } from '../../interfaces/task.interface';
import { TasksApiService } from '../../../features/tasks/services/tasks-api.service';
import { AuthFacade } from '../../../features/auth/auth.facade';
import { UserEntity } from '../../../domain/entities/user.entity';

@Component({
  selector: 'app-task-detail-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Overlay -->
    <div
      *ngIf="isOpen()"
      class="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
      [class.opacity-100]="panelVisible()"
      [class.opacity-0]="!panelVisible()"
      (click)="close()">
    </div>

    <!-- Panel -->
    <div
      *ngIf="isOpen()"
      class="fixed top-0 right-0 h-full w-1/2 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out"
      [class.translate-x-0]="panelVisible()"
      [class.translate-x-full]="!panelVisible()">

      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-blue-50">
        <div class="flex items-center space-x-4">
          <div class="text-xs font-mono text-slate-600 bg-white px-3 py-1.5 rounded-lg shadow-sm border border-slate-200">{{ task()?.code }}</div>
          <div class="flex items-center space-x-2">
            <span *ngIf="task()?.priority" [style.background-color]="getPriorityColor(task()!.priority)" class="text-xs text-white px-3 py-1 rounded-full shadow-sm">
              {{ getPriorityLabel(task()!.priority) }}
            </span>
            <span *ngIf="task()?.status" [style.background-color]="getStatusColor(task()!.status)" class="text-xs text-white px-3 py-1 rounded-full shadow-sm">
              {{ getStatusLabel(task()!.status) }}
            </span>
            <span *ngIf="task()?.is_overdue" class="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-1 rounded-full animate-pulse">
              <i class="fas fa-exclamation-triangle mr-1"></i>
              En retard
            </span>
          </div>
        </div>
        <button
          (click)="close()"
          class="p-2 text-gray-400 hover:text-white hover:bg-red-500 rounded-full transition-all duration-200">
          <i class="fas fa-times text-lg"></i>
        </button>
      </div>

      <!-- Loading -->
      <div *ngIf="loading()" class="flex justify-center py-12">
        <div class="text-center">
          <div class="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p class="text-gray-600 mt-2">Chargement des détails...</p>
        </div>
      </div>



      <!-- Content -->
      <div *ngIf="!loading() && task()" class="flex-1 overflow-y-auto" style="height: calc(100vh - 120px);">
        <div class="p-6 space-y-6">
          <!-- Title & Description -->
          <div>
            <div class="flex items-start justify-between mb-3">
              <h1 class="text-2xl font-bold text-gray-900 flex-1 leading-tight">{{ task()?.title }}</h1>
              <span *ngIf="task()?.type" class="ml-3 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                {{ getTypeLabel(task()!.type!) }}
              </span>
            </div>
            <div *ngIf="task()?.description" class="text-gray-600 text-sm leading-relaxed mb-4 p-3 bg-gray-50 rounded border-l-2 border-blue-400">
              {{ task()?.description }}
            </div>
            <div *ngIf="!task()?.description" class="text-gray-400 italic text-xs mb-4">
              Aucune description
            </div>

            <!-- Progression Compact -->
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-gray-700">Progression</span>
              <span class="text-lg font-bold text-blue-600">{{ task()?.progress_percentage || 0 }}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2 mb-1">
              <div class="bg-blue-600 h-2 rounded-full transition-all duration-500" [style.width.%]="task()?.progress_percentage || 0"></div>
            </div>
            <div class="text-xs text-gray-500 mb-4">{{ getProgressMessage(task()?.progress_percentage || 0) }}</div>
          </div>

          <!-- Compact Details Grid -->
          <div class="space-y-4">

            <!-- Projet -->
            <div class="pb-3 border-b border-gray-100">
              <h3 class="text-sm font-semibold text-gray-900 mb-2">Projet</h3>
              <div *ngIf="task()?.project">
                <div class="text-sm font-medium text-gray-800 mb-1">{{ task()!.project!.name }}</div>
                <div class="flex items-center space-x-2">
                  <span class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{{ task()!.project!.code }}</span>
                  <span *ngIf="task()?.project?.status"
                        [class]="getProjectStatusBadgeClass(task()!.project!.status!)"
                        class="text-xs px-2 py-1 rounded font-medium">
                    {{ getProjectStatusLabel(task()!.project!.status!) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Créé par -->
            <div class="pb-3 border-b border-gray-100">
              <h3 class="text-sm font-semibold text-gray-900 mb-2">Créé par</h3>
              <div *ngIf="task()?.creator" class="flex items-center space-x-2">
                <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                  {{ getInitials(getCreatorName(task()?.creator)) }}
                </div>
                <div>
                  <div class="text-sm font-medium text-gray-800">{{ getCreatorName(task()?.creator) }}</div>
                  <div class="text-xs text-gray-500">{{ task()?.creator?.email }}</div>
                </div>
              </div>
            </div>

            <!-- Temps & Échéance -->
            <div class="pb-3 border-b border-gray-100">
              <div class="grid grid-cols-2 gap-4">
                <!-- Temps -->
                <div>
                  <h3 class="text-sm font-semibold text-gray-900 mb-2">Temps</h3>
                  <div class="space-y-1">
                    <div *ngIf="task()?.estimated_hours" class="flex justify-between text-xs">
                      <span class="text-gray-600">Estimé</span>
                      <span class="font-medium text-gray-800">{{ task()?.estimated_hours }}h</span>
                    </div>
                    <div *ngIf="task()?.actual_hours" class="flex justify-between text-xs">
                      <span class="text-gray-600">Réel</span>
                      <span class="font-medium text-gray-800">{{ task()?.actual_hours }}h</span>
                    </div>
                    <div *ngIf="task()?.estimated_hours && task()?.actual_hours" class="flex justify-between text-xs pt-1 border-t border-gray-100">
                      <span class="text-gray-600">Écart</span>
                      <span [class]="getTimeVarianceClass()" class="font-medium px-1 py-0.5 rounded text-xs">
                        {{ getTimeVariance() }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Échéance -->
                <div>
                  <h3 class="text-sm font-semibold text-gray-900 mb-2">Échéance</h3>
                  <div *ngIf="task()?.due_date">
                    <div class="text-sm font-medium mb-1" [class.text-red-600]="task()?.is_overdue" [class.text-gray-800]="!task()?.is_overdue">
                      {{ formatDate(task()?.due_date!) }}
                    </div>
                    <div class="text-xs" [class.text-red-500]="task()?.is_overdue" [class.text-gray-500]="!task()?.is_overdue">
                      {{ getDaysUntilDue(task()?.due_date!) }}
                    </div>
                  </div>
                  <div *ngIf="!task()?.due_date" class="text-xs text-gray-400 italic">
                    Aucune échéance
                  </div>
                </div>
              </div>
            </div>

            <!-- Assignés -->
            <div class="pb-3 border-b border-gray-100">
              <h3 class="text-sm font-semibold text-gray-900 mb-2">
                Assignés
                <span class="text-xs font-normal text-gray-500">({{ task()?.assignees?.length || 0 }})</span>
              </h3>
              <div *ngIf="task()?.assignees && task()!.assignees!.length > 0" class="space-y-2">
                <div *ngFor="let assignee of task()!.assignees!" class="flex items-center space-x-2">
                  <div class="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                    {{ getInitials(assignee.name) }}
                  </div>
                  <div>
                    <div class="text-sm font-medium text-gray-800">{{ assignee.name }}</div>
                    <div class="text-xs text-gray-500">{{ assignee.email }}</div>
                  </div>
                </div>
              </div>
              <div *ngIf="!task()?.assignees || task()!.assignees!.length === 0" class="text-xs text-gray-400">
                Aucun utilisateur assigné
              </div>
            </div>

            <!-- Étiquettes -->
            <div class="pb-3">
              <h3 class="text-sm font-semibold text-gray-900 mb-2">
                Étiquettes
                <span class="text-xs font-normal text-gray-500">({{ task()?.tags?.length || 0 }})</span>
              </h3>
              <div *ngIf="task()?.tags && task()!.tags!.length > 0" class="flex flex-wrap gap-1">
                <span *ngFor="let tag of task()!.tags!"
                      [style.background-color]="tag.color || '#6b7280'"
                      class="text-xs text-white px-2 py-1 rounded font-medium">
                  {{ tag.name }}
                </span>
              </div>
              <div *ngIf="!task()?.tags || task()!.tags!.length === 0" class="text-xs text-gray-400">
                Aucune étiquette
              </div>
            </div>

          </div>
        </div>

        <!-- Tabs -->
        <div class="border-t border-gray-100 bg-white">
          <nav class="flex space-x-1 px-6 py-4" aria-label="Tabs">
            <button
              *ngFor="let tab of tabs"
              [class]="activeTab() === tab.id ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'"
              class="flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
              (click)="setActiveTab(tab.id)">
              <i [class]="getTabIcon(tab.id)" class="mr-2"></i>
              {{ tab.label }}
              <span
                *ngIf="tab.count !== undefined && tab.count > 0"
                [class]="activeTab() === tab.id ? 'bg-white bg-opacity-20 text-white' : 'bg-blue-100 text-blue-600'"
                class="ml-2 px-2 py-0.5 rounded-full text-xs font-medium">
                {{ tab.count }}
              </span>
            </button>
          </nav>
        </div>

        <!-- Tab Content -->
        <div class="p-6">
          <!-- Comments Tab -->
          <div *ngIf="activeTab() === 'comments'" class="space-y-3">
            <!-- Formulaire d'ajout de commentaire -->
            <div class="border-b border-gray-200 pb-3">
              <textarea
                [(ngModel)]="newComment"
                [disabled]="addingComment()"
                placeholder="Ajouter un commentaire..."
                class="w-full p-2 border border-gray-300 rounded resize-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900"
                rows="2"></textarea>
              <div class="flex justify-end mt-2">
                <button
                  (click)="addComment()"
                  [disabled]="!newComment().trim() || addingComment()"
                  class="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  <span *ngIf="addingComment()">Ajout...</span>
                  <span *ngIf="!addingComment()">Ajouter</span>
                </button>
              </div>
            </div>

            <!-- Liste des commentaires -->
            <div *ngIf="comments().length === 0" class="text-center py-4 text-gray-500 text-sm">
              Aucun commentaire
            </div>
            <div *ngFor="let comment of comments()" class="border-b border-gray-100 pb-2 mb-2 last:border-0 last:pb-0 last:mb-0">
              <div class="flex items-start space-x-2">
                <div class="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                  {{ getInitials(comment.user.name) }}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center space-x-1 mb-1">
                    <span class="font-medium text-gray-900 text-sm">{{ comment.user.name }}</span>
                    <span class="text-xs text-gray-500">{{ formatDate(comment.created_at) }}</span>
                    <span *ngIf="comment.is_edited" class="text-xs text-gray-400">(modifié)</span>
                  </div>
                  <p class="text-gray-700 text-sm leading-relaxed">{{ comment.content }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Files Tab -->
          <div *ngIf="activeTab() === 'files'" class="space-y-3">
            <!-- Formulaire d'upload -->
            <div class="border-b border-gray-200 pb-3">
              <div class="flex items-center space-x-2">
                <input
                  type="file"
                  #fileInput
                  (change)="onFileSelected($event)"
                  class="block w-full text-sm text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border file:border-gray-300 file:text-sm file:bg-white hover:file:bg-gray-50">
                <button
                  (click)="uploadFile(fileInput)"
                  [disabled]="uploadingFile()"
                  class="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors flex-shrink-0">
                  <span *ngIf="uploadingFile()">Upload...</span>
                  <span *ngIf="!uploadingFile()">Upload</span>
                </button>
              </div>
            </div>

            <!-- Liste des fichiers -->
            <div *ngIf="files().length === 0" class="text-center py-4 text-gray-500 text-sm">
              Aucun fichier
            </div>
            <div *ngFor="let file of files()" class="flex items-center justify-between border-b border-gray-100 pb-2 mb-2 last:border-0 last:pb-0 last:mb-0">
              <div class="flex items-center space-x-2 flex-1 min-w-0">
                <div class="w-6 h-6 bg-gray-400 rounded flex items-center justify-center text-white text-xs flex-shrink-0">
                  <i class="fas fa-file"></i>
                </div>
                <div class="min-w-0 flex-1">
                  <h4 class="font-medium text-gray-900 text-sm truncate">{{ file.name }}</h4>
                  <p class="text-xs text-gray-500">{{ file.file_size_human }} • {{ formatDate(file.created_at) }}</p>
                </div>
              </div>
              <div class="flex space-x-1 flex-shrink-0">
                <a
                  [href]="file.download_url"
                  target="_blank"
                  class="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                  title="Télécharger">
                  <i class="fas fa-download text-xs"></i>
                </a>
                <button
                  (click)="deleteFile(file.id)"
                  class="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                  title="Supprimer">
                  <i class="fas fa-trash text-xs"></i>
                </button>
              </div>
            </div>
          </div>

          <!-- Time Entries Tab -->
          <div *ngIf="activeTab() === 'time'" class="space-y-3">
            <!-- Contrôles de suivi de temps -->
            <div class="border-b border-gray-200 pb-3">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-gray-900">Suivi de temps</span>
                <div *ngIf="currentTimeSession()" class="text-xs text-blue-600">
                  En cours: {{ getCurrentSessionDuration() }}
                </div>
              </div>

              <div class="flex space-x-2 flex-wrap">
                <button
                  *ngIf="!isTrackingTime()"
                  (click)="startTimeTracking()"
                  class="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors">
                  <i class="fas fa-play mr-1"></i>
                  Démarrer
                </button>
                <button
                  *ngIf="isTrackingTime()"
                  (click)="stopTimeTracking()"
                  class="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors">
                  <i class="fas fa-stop mr-1"></i>
                  Arrêter
                </button>
                <button
                  (click)="showAddTimeForm = !showAddTimeForm"
                  class="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors">
                  <i class="fas fa-plus mr-1"></i>
                  Temps manuel
                </button>
              </div>

              <!-- Formulaire d'ajout de temps manuel -->
              <div *ngIf="showAddTimeForm" class="mt-2 p-2 border border-gray-200 rounded">
                <div class="grid grid-cols-2 gap-2 mb-2">
                  <input
                    [(ngModel)]="manualTimeHours"
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="Heures"
                    class="p-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 text-gray-900">
                  <input
                    [(ngModel)]="manualTimeDate"
                    type="date"
                    class="p-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 text-gray-900">
                </div>
                <textarea
                  [(ngModel)]="manualTimeDescription"
                  placeholder="Description (optionnel)"
                  rows="2"
                  class="w-full p-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 mb-2 text-gray-900"></textarea>
                <div class="flex justify-end space-x-1">
                  <button
                    (click)="showAddTimeForm = false"
                    class="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded text-sm transition-colors">
                    Annuler
                  </button>
                  <button
                    (click)="addManualTime()"
                    [disabled]="!manualTimeHours || !manualTimeDate"
                    class="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 transition-colors">
                    Ajouter
                  </button>
                </div>
              </div>
            </div>

            <!-- Liste des entrées de temps -->
            <div *ngIf="timeEntries().length === 0" class="text-center py-4 text-gray-500 text-sm">
              Aucune saisie de temps
            </div>
            <div *ngFor="let entry of timeEntries()" class="flex items-center justify-between border-b border-gray-100 pb-2 mb-2 last:border-0 last:pb-0 last:mb-0">
              <div class="flex items-center space-x-2 flex-1 min-w-0">
                <div class="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0">
                  <i class="fas fa-clock"></i>
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center space-x-1">
                    <span class="font-medium text-gray-900 text-sm">{{ entry.user.name }}</span>
                    <span class="text-xs text-gray-500">{{ formatDate(entry.created_at) }}</span>
                  </div>
                  <p *ngIf="entry.description" class="text-xs text-gray-600 truncate">{{ entry.description }}</p>
                </div>
              </div>
              <div class="text-right flex-shrink-0">
                <span class="font-bold text-sm text-green-600">{{ entry.hours }}h</span>
              </div>
            </div>
          </div>

          <!-- Difficulties Tab -->
          <div *ngIf="activeTab() === 'difficulties'" class="space-y-3">
            <!-- Formulaire d'ajout de difficulté -->
            <div class="border-b border-gray-200 pb-3">
              <div class="grid grid-cols-2 gap-2 mb-2">
                <select
                  [(ngModel)]="newDifficultyType"
                  class="p-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 text-gray-900">
                  <option value="technical">Technique</option>
                  <option value="resource">Ressource</option>
                  <option value="external">Externe</option>
                  <option value="other">Autre</option>
                </select>
                <select
                  [(ngModel)]="newDifficultySeverity"
                  class="p-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-500 text-gray-900">
                  <option value="low">Faible</option>
                  <option value="medium">Moyen</option>
                  <option value="high">Élevé</option>
                  <option value="critical">Critique</option>
                </select>
              </div>
              <textarea
                [(ngModel)]="newDifficultyDescription"
                placeholder="Description de la difficulté..."
                class="w-full p-2 border border-gray-300 rounded resize-none text-sm focus:ring-1 focus:ring-blue-500 mb-2 text-gray-900"
                rows="2"></textarea>
              <textarea
                [(ngModel)]="newDifficultySolution"
                placeholder="Solution proposée (optionnel)..."
                class="w-full p-2 border border-gray-300 rounded resize-none text-sm focus:ring-1 focus:ring-blue-500 mb-2 text-gray-900"
                rows="2"></textarea>
              <div class="flex justify-end">
                <button
                  (click)="addDifficulty()"
                  [disabled]="!newDifficultyDescription().trim() || addingDifficulty()"
                  class="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  <span *ngIf="addingDifficulty()">Ajout...</span>
                  <span *ngIf="!addingDifficulty()">Signaler</span>
                </button>
              </div>
            </div>

            <!-- Liste des difficultés -->
            <div *ngIf="difficulties().length === 0" class="text-center py-3 text-gray-500 text-sm">
              Aucune difficulté signalée
            </div>
            <div *ngFor="let difficulty of difficulties()" class="border-b border-gray-200 pb-2 mb-2 last:mb-0 last:border-b-0 last:pb-0">
              <div class="flex items-start space-x-2">
                <div class="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 flex-shrink-0 mt-0.5">
                  <i class="fas fa-exclamation-triangle text-xs"></i>
                </div>
                <div class="flex-1">
                  <div class="flex items-center space-x-2 mb-1">
                    <span class="font-medium text-gray-900 text-sm">{{ difficulty.user.name }}</span>
                    <span class="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">
                      {{ getSeverityLabel(difficulty.severity) }}
                    </span>
                    <span class="text-xs text-gray-500">{{ formatDate(difficulty.created_at) }}</span>
                  </div>
                  <p class="text-gray-700 text-sm mb-1">{{ difficulty.description }}</p>
                  <div *ngIf="difficulty.proposed_solution" class="text-sm text-gray-600 border-l-2 border-gray-300 pl-2 mb-1">
                    <span class="font-medium">Solution :</span> {{ difficulty.proposed_solution }}
                  </div>
                  <div *ngIf="difficulty.status === 'resolved' && difficulty.resolution" class="text-sm text-gray-700 border-l-2 border-green-300 pl-2 mb-1">
                    <span class="font-medium">Résolution :</span> {{ difficulty.resolution }}
                  </div>
                  <button
                    *ngIf="difficulty.status === 'open'"
                    (click)="showResolutionForm(difficulty.id)"
                    class="mt-1 px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors">
                    Résoudre
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      z-index: 9999;
    }
  `]
})
export class TaskDetailPanelComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  @Input() taskId: number | null = null;
  @Output() closed = new EventEmitter<void>();

  // Signals
  isOpen = signal(false);
  panelVisible = signal(false);
  loading = signal(false);
  task = signal<Task | null>(null);
  comments = signal<TaskComment[]>([]);
  files = signal<TaskFile[]>([]);
  timeEntries = signal<TaskTimeEntry[]>([]);
  difficulties = signal<TaskDifficulty[]>([]);
  activeTab = signal('comments');

  // Formulaires
  newComment = signal('');
  newDifficultyType = signal<'technical' | 'resource' | 'external' | 'other'>('technical');
  newDifficultySeverity = signal<'low' | 'medium' | 'high' | 'critical'>('medium');
  newDifficultyDescription = signal('');
  newDifficultySolution = signal('');

  // États
  addingComment = signal(false);
  uploadingFile = signal(false);
  addingDifficulty = signal(false);

  // Suivi de temps
  isTrackingTime = signal(false);
  currentTimeSession = signal<any>(null);

  // Formulaires temps manuel
  showAddTimeForm = false;
  manualTimeHours: number | null = null;
  manualTimeDate = '';
  manualTimeDescription = '';

  tabs = [
    { id: 'comments', label: 'Commentaires', count: undefined as number | undefined },
    { id: 'files', label: 'Fichiers', count: undefined as number | undefined },
    { id: 'time', label: 'Temps', count: undefined as number | undefined },
    { id: 'difficulties', label: 'Difficultés', count: undefined as number | undefined }
  ];

  constructor(
    private tasksApiService: TasksApiService,
    private authFacade: AuthFacade
  ) {}

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  open(taskId: number): void {
    this.taskId = taskId;
    this.isOpen.set(true);

    // Delay for animation
    setTimeout(() => {
      this.panelVisible.set(true);
    }, 10);

    this.loadTaskDetails();
  }

  close(): void {
    this.panelVisible.set(false);

    // Delay for animation
    setTimeout(() => {
      this.isOpen.set(false);
      this.task.set(null);
      this.comments.set([]);
      this.files.set([]);
      this.timeEntries.set([]);
      this.difficulties.set([]);
      this.closed.emit();
    }, 300);
  }

  private loadTaskDetails(): void {
    if (!this.taskId) {
      return;
    }

    this.loading.set(true);

    const include = ['project', 'creator', 'assignees', 'tags', 'comments', 'files', 'time_entries', 'difficulties'];

    this.tasksApiService.getTask(this.taskId, include)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('API Response for task detail:', response);

          if (response?.success && response?.data) {
            // Traiter le nouveau format de réponse - les données sont dans response.data.task
            let taskData = response.data.task || response.data;

            console.log('Task data extracted:', taskData);

            // S'assurer que les métadonnées essentielles sont présentes
            if (!taskData.progress_percentage && taskData.progress_percentage !== 0) {
              taskData.progress_percentage = 0;
            }
            if (!taskData.is_overdue && taskData.is_overdue !== false) {
              taskData.is_overdue = false;
            }

            // Ajouter les métadonnées de la réponse directement dans taskData
            if (response.data.is_overdue !== undefined) {
              taskData.is_overdue = response.data.is_overdue;
            }
            if (response.data.progress_percentage !== undefined) {
              taskData.progress_percentage = response.data.progress_percentage;
            }
            if (response.data.comments_count !== undefined) {
              taskData.comments_count = response.data.comments_count;
            }
            if (response.data.files_count !== undefined) {
              taskData.files_count = response.data.files_count;
            }

            // Normaliser les données pour s'assurer que assignees est toujours défini
            if (!taskData.assignees && taskData.assigned_users) {
              taskData.assignees = taskData.assigned_users;
            }
            if (!taskData.assignees) {
              taskData.assignees = [];
            }

            // Normaliser les tags si pas définis
            if (!taskData.tags) {
              taskData.tags = [];
            }

            console.log('Final processed task data:', taskData);

            this.task.set(taskData);
            this.comments.set(taskData.comments || []);
            this.files.set(taskData.files || []);
            this.timeEntries.set(taskData.time_entries || []);
            this.difficulties.set(taskData.difficulties || []);

            // Update tab counts
            this.updateTabCounts();

            console.log('Task signal set:', this.task());
          } else {
            console.error('Invalid response format:', response);
          }

          this.loading.set(false);
        },
        error: (error) => {
          console.error('Erreur lors du chargement des détails de la tâche:', error);
          this.loading.set(false);
        }
      });
  }

  private updateTabCounts(): void {
    this.tabs[0].count = this.comments().length;
    this.tabs[1].count = this.files().length;
    this.tabs[2].count = this.timeEntries().length;
    this.tabs[3].count = this.difficulties().length;
  }

  setActiveTab(tabId: string): void {
    this.activeTab.set(tabId);
  }

  getPriorityColor(priority: string): string {
    const colors: Record<string, string> = {
      'basse': '#6b7280',
      'normale': '#3b82f6',
      'haute': '#f59e0b',
      'critique': '#ef4444'
    };
    return colors[priority] || '#6b7280';
  }

  getPriorityLabel(priority: string): string {
    const labels: Record<string, string> = {
      'basse': 'Basse',
      'normale': 'Normale',
      'haute': 'Haute',
      'critique': 'Critique'
    };
    return labels[priority] || priority;
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'a_faire': '#6b7280',
      'en_cours': '#3b82f6',
      'bloque': '#f59e0b',
      'test': '#8b5cf6',
      'termine': '#10b981'
    };
    return colors[status] || '#6b7280';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'a_faire': 'À faire',
      'en_cours': 'En cours',
      'bloque': 'Bloqué',
      'test': 'En test',
      'termine': 'Terminé'
    };
    return labels[status] || status;
  }

  getSeverityColor(severity: string): string {
    return 'bg-gray-100 text-gray-700';
  }

  getSeverityLabel(severity: string): string {
    const labels: Record<string, string> = {
      'low': 'Faible',
      'medium': 'Moyen',
      'high': 'Élevé',
      'critical': 'Critique'
    };
    return labels[severity] || severity;
  }

  getCreatorName(creator: any): string {
    if (!creator) return 'Utilisateur';
    if (creator.name) return creator.name;
    if (creator.first_name || creator.last_name) {
      return `${creator.first_name || ''} ${creator.last_name || ''}`.trim();
    }
    return creator.email || 'Utilisateur';
  }

  getInitials(name: string): string {
    if (!name) return '?';
    const names = name.split(' ');
    if (names.length === 1) {
      return names[0].substring(0, 2).toUpperCase();
    }
    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
  }

  formatDate(date: string): string {
    const taskDate = new Date(date);
    const now = new Date();
    const diffTime = taskDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (Math.abs(diffDays) < 1) {
      return taskDate.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else if (diffDays < 0) {
      return `Il y a ${Math.abs(diffDays)} jour(s)`;
    } else {
      return taskDate.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
  }

  getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'dev': 'Développement',
      'design': 'Design',
      'test': 'Test',
      'analyse': 'Analyse',
      'autre': 'Autre'
    };
    return labels[type] || type;
  }

  getProjectStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'planifie': 'Planifié',
      'en_cours': 'En cours',
      'en_pause': 'En pause',
      'en_danger': 'En danger',
      'termine': 'Terminé',
      'annule': 'Annulé'
    };
    return labels[status] || status;
  }

  getProgressMessage(percentage: number): string {
    if (percentage === 0) return 'Pas encore démarré';
    if (percentage < 25) return 'En début de réalisation';
    if (percentage < 50) return 'Progression modérée';
    if (percentage < 75) return 'Bien avancé';
    if (percentage < 100) return 'Presque terminé';
    return 'Terminé !';
  }

  getTabIcon(tabId: string): string {
    const icons: Record<string, string> = {
      'comments': 'fas fa-comments',
      'files': 'fas fa-paperclip',
      'time': 'fas fa-stopwatch',
      'difficulties': 'fas fa-exclamation-circle'
    };
    return icons[tabId] || 'fas fa-circle';
  }


  getProjectStatusBadgeClass(status: string): string {
    const classes: Record<string, string> = {
      'planifie': 'bg-blue-100 text-blue-800',
      'en_cours': 'bg-green-100 text-green-800',
      'en_pause': 'bg-yellow-100 text-yellow-800',
      'en_danger': 'bg-red-100 text-red-800',
      'termine': 'bg-emerald-100 text-emerald-800',
      'annule': 'bg-gray-100 text-gray-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  }

  formatDueDate(date: string): string {
    const taskDate = new Date(date);
    return taskDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  getDaysUntilDue(date: string): string {
    const taskDate = new Date(date);
    const now = new Date();
    const diffTime = taskDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Échéance aujourd\'hui';
    } else if (diffDays === 1) {
      return 'Échéance demain';
    } else if (diffDays > 1) {
      return `Dans ${diffDays} jours`;
    } else {
      return `En retard de ${Math.abs(diffDays)} jour(s)`;
    }
  }

  getTimeVariance(): string {
    const estimated = parseFloat(String(this.task()?.estimated_hours || '0'));
    const actual = parseFloat(String(this.task()?.actual_hours || '0'));

    if (estimated === 0 || actual === 0) return 'N/A';

    const variance = actual - estimated;
    const sign = variance > 0 ? '+' : '';
    return `${sign}${variance.toFixed(1)}h`;
  }

  getTimeVarianceClass(): string {
    const estimated = parseFloat(String(this.task()?.estimated_hours || '0'));
    const actual = parseFloat(String(this.task()?.actual_hours || '0'));

    if (estimated === 0 || actual === 0) return 'bg-gray-100 text-gray-700';

    const variance = actual - estimated;
    if (variance > 0) {
      return 'bg-red-100 text-red-700'; // Dépassement
    } else if (variance < 0) {
      return 'bg-green-100 text-green-700'; // En avance
    } else {
      return 'bg-blue-100 text-blue-700'; // Exact
    }
  }

  // === MÉTHODES POUR LES COMMENTAIRES ===

  addComment(): void {
    if (!this.newComment().trim() || !this.taskId) return;

    this.addingComment.set(true);

    const commentData = {
      content: this.newComment().trim()
    };

    this.tasksApiService.addComment(this.taskId, commentData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response?.success) {
            // Ajouter le nouveau commentaire à la liste
            this.comments.update(comments => [response.data, ...comments]);
            this.newComment.set('');
            this.updateTabCounts();
          }
          this.addingComment.set(false);
        },
        error: (error) => {
          console.error('Erreur lors de l\'ajout du commentaire:', error);
          this.addingComment.set(false);
        }
      });
  }

  // === MÉTHODES POUR LES FICHIERS ===

  selectedFile: File | null = null;

  onFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  uploadFile(fileInput: HTMLInputElement): void {
    if (!this.selectedFile || !this.taskId) return;

    this.uploadingFile.set(true);

    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('name', this.selectedFile.name);

    this.tasksApiService.uploadFile(this.taskId, formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response?.success) {
            // Ajouter le nouveau fichier à la liste
            this.files.update(files => [response.data, ...files]);
            fileInput.value = '';
            this.selectedFile = null;
            this.updateTabCounts();
          }
          this.uploadingFile.set(false);
        },
        error: (error) => {
          console.error('Erreur lors de l\'upload du fichier:', error);
          this.uploadingFile.set(false);
        }
      });
  }

  deleteFile(fileId: number): void {
    if (!this.taskId) return;

    if (confirm('Êtes-vous sûr de vouloir supprimer ce fichier ?')) {
      this.tasksApiService.deleteFile(this.taskId, fileId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response?.success) {
              // Supprimer le fichier de la liste
              this.files.update(files => files.filter(f => f.id !== fileId));
              this.updateTabCounts();
            }
          },
          error: (error) => {
            console.error('Erreur lors de la suppression du fichier:', error);
          }
        });
    }
  }

  // === MÉTHODES POUR LE SUIVI DE TEMPS ===

  startTimeTracking(): void {
    if (!this.taskId) return;

    const trackingData = {
      description: 'Session de travail'
    };

    this.tasksApiService.startTimeTracking(this.taskId, trackingData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response?.success) {
            this.isTrackingTime.set(true);
            this.currentTimeSession.set(response.data);
          }
        },
        error: (error) => {
          console.error('Erreur lors du démarrage du suivi de temps:', error);
        }
      });
  }

  stopTimeTracking(): void {
    if (!this.taskId) return;

    this.tasksApiService.stopTimeTracking(this.taskId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response?.success) {
            this.isTrackingTime.set(false);
            this.currentTimeSession.set(null);
            // Recharger les entrées de temps
            this.loadTaskTimeEntries();
          }
        },
        error: (error) => {
          console.error('Erreur lors de l\'arrêt du suivi de temps:', error);
        }
      });
  }

  getCurrentSessionDuration(): string {
    const session = this.currentTimeSession();
    if (!session?.start_time) return '0:00';

    const start = new Date(session.start_time);
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  }

  addManualTime(): void {
    if (!this.manualTimeHours || !this.manualTimeDate || !this.taskId) return;

    const timeData = {
      date: this.manualTimeDate,
      hours: this.manualTimeHours,
      description: this.manualTimeDescription || undefined
    };

    this.tasksApiService.addTimeEntry(this.taskId, timeData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response?.success) {
            // Ajouter la nouvelle entrée à la liste
            this.timeEntries.update(entries => [response.data, ...entries]);
            // Réinitialiser le formulaire
            this.manualTimeHours = null;
            this.manualTimeDate = '';
            this.manualTimeDescription = '';
            this.showAddTimeForm = false;
            this.updateTabCounts();
          }
        },
        error: (error) => {
          console.error('Erreur lors de l\'ajout du temps manuel:', error);
        }
      });
  }

  private loadTaskTimeEntries(): void {
    if (!this.taskId) return;

    this.tasksApiService.getTaskTimeEntries(this.taskId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response?.success) {
            this.timeEntries.set(response.data || []);
            this.updateTabCounts();
          }
        },
        error: (error) => {
          console.error('Erreur lors du chargement des entrées de temps:', error);
        }
      });
  }

  // === MÉTHODES POUR LES DIFFICULTÉS ===

  addDifficulty(): void {
    if (!this.newDifficultyDescription().trim() || !this.taskId) return;

    this.addingDifficulty.set(true);

    const difficultyData = {
      type: this.newDifficultyType(),
      severity: this.newDifficultySeverity(),
      description: this.newDifficultyDescription().trim(),
      proposed_solution: this.newDifficultySolution().trim() || undefined
    };

    this.tasksApiService.reportDifficulty(this.taskId, difficultyData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response?.success) {
            // Ajouter la nouvelle difficulté à la liste
            this.difficulties.update(difficulties => [response.data, ...difficulties]);
            // Réinitialiser le formulaire
            this.newDifficultyType.set('technical');
            this.newDifficultySeverity.set('medium');
            this.newDifficultyDescription.set('');
            this.newDifficultySolution.set('');
            this.updateTabCounts();
          }
          this.addingDifficulty.set(false);
        },
        error: (error) => {
          console.error('Erreur lors du signalement de la difficulté:', error);
          this.addingDifficulty.set(false);
        }
      });
  }

  showResolutionForm(difficultyId: number): void {
    const resolution = prompt('Décrivez la résolution de cette difficulté :');
    if (resolution?.trim()) {
      this.resolveDifficulty(difficultyId, resolution.trim());
    }
  }

  private resolveDifficulty(difficultyId: number, resolution: string): void {
    if (!this.taskId) return;

    const resolutionData = {
      status: 'resolved' as const,
      resolution,
      resolved_by: 1 // TODO: Get current user ID
    };

    this.tasksApiService.resolveDifficulty(this.taskId, difficultyId, resolutionData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response?.success) {
            // Mettre à jour la difficulté dans la liste
            this.difficulties.update(difficulties =>
              difficulties.map(d => d.id === difficultyId ? response.data : d)
            );
          }
        },
        error: (error) => {
          console.error('Erreur lors de la résolution de la difficulté:', error);
        }
      });
  }
}