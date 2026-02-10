// ========================================
// COMPOSANT DE GESTION DES STATUTS DE TÂCHES
// Changement de statut avec workflow et commentaires
// ========================================

import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { TasksApiService } from '../../services/tasks-api.service';
import {
  Task,
  TaskStatus,
  TaskStatusOption,
  UpdateTaskStatusRequest,
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS
} from '../../models/task.models';

interface StatusTransition {
  from: TaskStatus;
  to: TaskStatus;
  label: string;
  requiresComment: boolean;
  color: string;
  icon: string;
}

@Component({
  selector: 'app-task-status',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="task-status-manager">
      <!-- Statut actuel -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3">
          <span class="text-sm font-medium text-gray-700">Statut actuel:</span>
          <span
            class="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium text-white"
            [style.background-color]="TASK_STATUS_COLORS[task.status]">
            <i [class]="getStatusIcon(task.status)" class="mr-2"></i>
            {{ TASK_STATUS_LABELS[task.status] }}
          </span>
        </div>

        @if (canChangeStatus()) {
          <button
            (click)="showStatusSelector.set(!showStatusSelector())"
            [disabled]="updating()"
            class="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
            <i class="bi bi-arrow-repeat mr-1"></i>
            Changer statut
          </button>
        }
      </div>

      <!-- Sélecteur de statut -->
      @if (showStatusSelector()) {
        <div class="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 class="font-medium text-gray-900 mb-4">Changer le statut</h3>

          <!-- Transitions rapides -->
          @if (quickTransitions().length > 0) {
            <div class="mb-4">
              <p class="text-sm text-gray-600 mb-2">Actions rapides :</p>
              <div class="flex flex-wrap gap-2">
                @for (transition of quickTransitions(); track transition.to) {
                  <button
                    (click)="selectTransition(transition)"
                    [disabled]="updating()"
                    class="px-3 py-1.5 text-sm rounded-md font-medium transition-colors"
                    [style.background-color]="transition.color + '20'"
                    [style.color]="transition.color"
                    [style.border]="'1px solid ' + transition.color + '40'">
                    <i [class]="transition.icon" class="mr-1"></i>
                    {{ transition.label }}
                  </button>
                }
              </div>
            </div>
            <div class="border-t border-gray-200 pt-4">
              <p class="text-sm text-gray-600 mb-2">Ou choisir un statut :</p>
            </div>
          }

          <!-- Sélection complète -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            @for (statusOption of availableStatuses(); track statusOption.value) {
              <button
                (click)="selectStatus(statusOption.value)"
                [disabled]="statusOption.value === task.status || updating()"
                class="p-3 text-left border rounded-lg hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                [class.bg-white]="selectedStatus() === statusOption.value"
                [class.ring-2]="selectedStatus() === statusOption.value"
                [class.ring-blue-500]="selectedStatus() === statusOption.value">

                <div class="flex items-center gap-3">
                  <span
                    class="w-3 h-3 rounded-full"
                    [style.background-color]="statusOption.color">
                  </span>
                  <div class="flex-1">
                    <div class="font-medium text-gray-900">{{ statusOption.label }}</div>
                    <div class="text-sm text-gray-600">{{ statusOption.description }}</div>
                  </div>
                  @if (statusOption.value === task.status) {
                    <i class="bi bi-check-circle text-green-600"></i>
                  }
                </div>
              </button>
            }
          </div>

          <!-- Formulaire de changement -->
          @if (selectedStatus() && selectedStatus() !== task.status) {
            <form [formGroup]="statusForm" (ngSubmit)="updateStatus()" class="mt-4 p-4 bg-white rounded-lg border border-gray-200">
              <div class="flex items-start gap-3 mb-4">
                <i class="bi bi-arrow-right text-blue-600 mt-1"></i>
                <div class="flex-1">
                  <p class="text-sm text-gray-900">
                    <span class="font-medium">{{ TASK_STATUS_LABELS[task.status] }}</span>
                    →
                    <span class="font-medium">{{ getSelectedStatusLabel() }}</span>
                  </p>
                  @if (requiresComment()) {
                    <p class="text-xs text-orange-600 mt-1">
                      <i class="bi bi-exclamation-triangle mr-1"></i>
                      Ce changement nécessite un commentaire
                    </p>
                  }
                </div>
              </div>

              <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Commentaire
                  @if (requiresComment()) {
                    <span class="text-red-500">*</span>
                  }
                </label>
                <textarea
                  formControlName="comment"
                  placeholder="Décrivez la raison de ce changement de statut..."
                  rows="3"
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  maxlength="500">
                </textarea>
                @if (requiresComment() && statusForm.get('comment')?.hasError('required') && statusForm.get('comment')?.touched) {
                  <p class="text-red-600 text-xs mt-1">Le commentaire est obligatoire pour ce changement</p>
                }
                <div class="text-xs text-gray-500 mt-1">
                  {{ statusForm.get('comment')?.value?.length || 0 }}/500 caractères
                </div>
              </div>

              @if (showNotificationOptions()) {
                <div class="mb-4">
                  <label class="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      formControlName="notifyAssignees"
                      class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    Notifier les personnes assignées
                  </label>
                </div>
              }

              <div class="flex gap-2">
                <button
                  type="submit"
                  [disabled]="statusForm.invalid || updating()"
                  class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm">
                  @if (updating()) {
                    <i class="bi bi-arrow-repeat animate-spin mr-2"></i>
                    Mise à jour...
                  } @else {
                    <i class="bi bi-check mr-2"></i>
                    Confirmer le changement
                  }
                </button>
                <button
                  type="button"
                  (click)="cancelStatusChange()"
                  [disabled]="updating()"
                  class="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 text-sm">
                  Annuler
                </button>
              </div>
            </form>
          }
        </div>
      }

      <!-- Historique des changements de statut -->
      @if (showHistory) {
        <div class="mt-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="font-medium text-gray-900">Historique des statuts</h3>
            <button
              (click)="loadStatusHistory()"
              [disabled]="loadingHistory()"
              class="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50">
              <i class="bi bi-arrow-clockwise mr-1" [class.animate-spin]="loadingHistory()"></i>
              Actualiser
            </button>
          </div>

          @if (loadingHistory()) {
            <div class="flex items-center justify-center py-6">
              <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span class="ml-2 text-sm text-gray-600">Chargement...</span>
            </div>
          } @else if (statusHistory().length > 0) {
            <div class="space-y-3">
              @for (entry of statusHistory(); track entry.id) {
                <div class="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <i [class]="getActionIcon(entry.action)" class="text-blue-600 mt-1"></i>
                  <div class="flex-1">
                    <div class="flex items-center gap-2">
                      <span class="text-sm font-medium text-gray-900">
                        {{ entry.user.name }}
                      </span>
                      <span class="text-sm text-gray-600">
                        {{ getActionDescription(entry) }}
                      </span>
                      <span class="text-xs text-gray-500">
                        {{ formatDate(entry.created_at) }}
                      </span>
                    </div>
                    @if (entry.old_value && entry.new_value) {
                      <div class="text-sm text-gray-600 mt-1">
                        <span
                          class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white mr-2"
                          [style.background-color]="getStatusColorByValue(entry.old_value)">
                          {{ getStatusLabelByValue(entry.old_value) }}
                        </span>
                        →
                        <span
                          class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-white ml-2"
                          [style.background-color]="getStatusColorByValue(entry.new_value)">
                          {{ getStatusLabelByValue(entry.new_value) }}
                        </span>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          } @else {
            <div class="text-center py-6 text-gray-500">
              <i class="bi bi-clock-history text-2xl mb-2"></i>
              <p class="text-sm">Aucun historique disponible</p>
            </div>
          }
        </div>
      }

      <!-- Erreurs -->
      @if (error()) {
        <div class="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div class="text-sm text-red-800">{{ error() }}</div>
        </div>
      }
    </div>
  `
})
export class TaskStatusComponent implements OnInit, OnDestroy {
  @Input({ required: true }) task!: Task;
  @Input() showHistory = true;
  @Input() allowedTransitions: StatusTransition[] = [];

  @Output() statusChanged = new EventEmitter<TaskStatus>();

  private destroy$ = new Subject<void>();
  private tasksApiService = inject(TasksApiService);
  private fb = inject(FormBuilder);

  // État du composant
  availableStatuses = signal<TaskStatusOption[]>([]);
  statusHistory = signal<any[]>([]);
  selectedStatus = signal<TaskStatus | null>(null);
  showStatusSelector = signal(false);
  updating = signal(false);
  loadingHistory = signal(false);
  error = signal('');

  // Formulaire
  statusForm: FormGroup;

  // Constantes pour le template
  TASK_STATUS_LABELS = TASK_STATUS_LABELS;
  TASK_STATUS_COLORS = TASK_STATUS_COLORS;

  // Transitions prédéfinies
  private defaultTransitions: StatusTransition[] = [
    {
      from: TaskStatus.A_FAIRE,
      to: TaskStatus.EN_COURS,
      label: 'Commencer',
      requiresComment: false,
      color: '#3b82f6',
      icon: 'bi-play-circle'
    },
    {
      from: TaskStatus.EN_COURS,
      to: TaskStatus.TERMINE,
      label: 'Terminer',
      requiresComment: false,
      color: '#10b981',
      icon: 'bi-check-circle'
    },
    {
      from: TaskStatus.EN_COURS,
      to: TaskStatus.BLOQUE,
      label: 'Bloquer',
      requiresComment: true,
      color: '#f59e0b',
      icon: 'bi-exclamation-triangle'
    },
    {
      from: TaskStatus.BLOQUE,
      to: TaskStatus.EN_COURS,
      label: 'Débloquer',
      requiresComment: false,
      color: '#3b82f6',
      icon: 'bi-play-circle'
    },
    {
      from: TaskStatus.TEST,
      to: TaskStatus.TERMINE,
      label: 'Valider',
      requiresComment: false,
      color: '#10b981',
      icon: 'bi-check-circle'
    },
    {
      from: TaskStatus.TEST,
      to: TaskStatus.EN_COURS,
      label: 'Reprendre',
      requiresComment: true,
      color: '#f59e0b',
      icon: 'bi-arrow-counterclockwise'
    }
  ];

  constructor() {
    this.statusForm = this.fb.group({
      comment: [''],
      notifyAssignees: [true]
    });
  }

  ngOnInit(): void {
    this.loadAvailableStatuses();
    if (this.showHistory) {
      this.loadStatusHistory();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadAvailableStatuses(): void {
    this.tasksApiService.getTaskStatuses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.availableStatuses.set(response.data || []);
        },
        error: () => {
          this.error.set('Erreur lors du chargement des statuts');
        }
      });
  }

  loadStatusHistory(): void {
    if (!this.showHistory) return;

    this.loadingHistory.set(true);
    this.tasksApiService.getTaskHistory(this.task.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const statusChanges = (response.data || []).filter(entry =>
            entry.action === 'status_changed'
          );
          this.statusHistory.set(statusChanges);
          this.loadingHistory.set(false);
        },
        error: () => {
          this.loadingHistory.set(false);
        }
      });
  }

  // Computed getters
  quickTransitions = (): StatusTransition[] => {
    const transitions = this.allowedTransitions.length > 0 ? this.allowedTransitions : this.defaultTransitions;
    return transitions.filter(t => t.from === this.task.status);
  };

  requiresComment = (): boolean => {
    const selected = this.selectedStatus();
    if (!selected) return false;

    const transition = this.quickTransitions().find(t => t.to === selected);
    return transition?.requiresComment || false;
  };

  showNotificationOptions = (): boolean => {
    return !!(this.task.assignees && this.task.assignees.length > 0);
  };

  // Actions
  selectTransition(transition: StatusTransition): void {
    this.selectStatus(transition.to);

    if (transition.requiresComment) {
      this.statusForm.patchValue({
        comment: this.statusForm.get('comment')?.setValidators ? '' : this.statusForm.get('comment')?.value
      });
      this.statusForm.get('comment')?.setValidators(transition.requiresComment ? [Validators.required] : []);
    }
  }

  selectStatus(status: TaskStatus): void {
    if (status === this.task.status) return;

    this.selectedStatus.set(status);

    // Mettre à jour les validateurs
    const needsComment = this.requiresComment();
    const commentControl = this.statusForm.get('comment');

    if (needsComment) {
      commentControl?.setValidators([Validators.required]);
    } else {
      commentControl?.clearValidators();
    }
    commentControl?.updateValueAndValidity();
  }

  updateStatus(): void {
    if (this.statusForm.invalid || !this.selectedStatus()) return;

    this.updating.set(true);
    this.error.set('');

    const statusData: UpdateTaskStatusRequest = {
      status: this.selectedStatus()!,
      comment: this.statusForm.get('comment')?.value || undefined
    };

    this.tasksApiService.updateTaskStatus(this.task.id, statusData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.data) {
            this.task.status = response.data.status;
            this.statusChanged.emit(response.data.status);

            if (this.showHistory) {
              this.loadStatusHistory();
            }
          }

          this.cancelStatusChange();
          this.updating.set(false);
        },
        error: (error) => {
          this.error.set(error.message || 'Erreur lors de la mise à jour du statut');
          this.updating.set(false);
        }
      });
  }

  cancelStatusChange(): void {
    this.selectedStatus.set(null);
    this.showStatusSelector.set(false);
    this.statusForm.reset({
      comment: '',
      notifyAssignees: true
    });
    this.error.set('');
  }

  // Méthodes utilitaires
  canChangeStatus(): boolean {
    // TODO: Vérifier les permissions
    return true;
  }

  getSelectedStatusLabel(): string {
    const status = this.selectedStatus();
    return status ? TASK_STATUS_LABELS[status] : '';
  }

  getStatusIcon(status: TaskStatus): string {
    switch (status) {
      case TaskStatus.A_FAIRE:
        return 'bi-circle';
      case TaskStatus.EN_COURS:
        return 'bi-play-circle';
      case TaskStatus.BLOQUE:
        return 'bi-exclamation-triangle';
      case TaskStatus.TEST:
        return 'bi-check2-circle';
      case TaskStatus.TERMINE:
        return 'bi-check-circle-fill';
      default:
        return 'bi-circle';
    }
  }

  getActionIcon(action: string): string {
    switch (action) {
      case 'status_changed':
        return 'bi-arrow-repeat';
      case 'created':
        return 'bi-plus-circle';
      case 'assigned':
        return 'bi-person-check';
      default:
        return 'bi-circle';
    }
  }

  getActionDescription(entry: any): string {
    switch (entry.action) {
      case 'status_changed':
        return 'a changé le statut';
      case 'created':
        return 'a créé la tâche';
      case 'assigned':
        return 'a assigné la tâche';
      default:
        return entry.action;
    }
  }

  getStatusLabelByValue(value: string): string {
    return TASK_STATUS_LABELS[value as TaskStatus] || value;
  }

  getStatusColorByValue(value: string): string {
    return TASK_STATUS_COLORS[value as TaskStatus] || '#6b7280';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'À l\'instant';
    if (diffMinutes < 60) return `${diffMinutes}min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}j`;

    return date.toLocaleDateString('fr-FR');
  }
}