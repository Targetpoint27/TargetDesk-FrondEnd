// ========================================
// COMPOSANT CRÉATION DE TÂCHE
// Formulaire complet pour créer une nouvelle tâche
// ========================================

import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil, Observable } from 'rxjs';

import { Task, TaskPriority, TaskType, CreateTaskRequest } from '../../models/task.models';
import { Project } from '../../../projects/models/project.models';
import { UserEntity } from '../../../../core/models/user.models';
import { TasksApiService } from '../../services/tasks-api.service';
import { ProjectsApiService } from '../../../projects/services/projects-api.service';
import { LoggingService } from '../../../../core/logging/logging.service';

@Component({
  selector: 'app-task-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <!-- En-tête -->
      <div class="bg-white shadow-sm border-b border-gray-200">
        <div class="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-3xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Créer une nouvelle tâche
              </h1>
              <p class="mt-2 text-sm text-gray-600">
                Remplissez les informations pour créer une nouvelle tâche
              </p>
            </div>
            <button
              type="button"
              (click)="goBack()"
              class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
              </svg>
              Retour
            </button>
          </div>
        </div>
      </div>

      <!-- Contenu principal -->
      <div class="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <!-- Message d'erreur global -->
        <div *ngIf="error()" class="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
              </svg>
            </div>
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800">Erreur de création</h3>
              <p class="mt-1 text-sm text-red-700">{{ error() }}</p>
            </div>
          </div>
        </div>

        <!-- Formulaire -->
        <form [formGroup]="taskForm" (ngSubmit)="onSubmit()" class="space-y-8">
          <div class="bg-white shadow-sm rounded-lg border border-gray-200">
            <!-- Informations de base -->
            <div class="px-6 py-5 border-b border-gray-200">
              <h3 class="text-lg font-medium text-gray-900">Informations de base</h3>
              <p class="mt-1 text-sm text-gray-500">Définissez les informations essentielles de la tâche</p>
            </div>

            <div class="px-6 py-5 space-y-6">
              <!-- Titre -->
              <div>
                <label for="title" class="block text-sm font-medium text-gray-700 mb-2">
                  Titre de la tâche *
                </label>
                <input
                  type="text"
                  id="title"
                  formControlName="title"
                  placeholder="Ex: Implémenter la fonctionnalité de connexion"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  [class.border-red-300]="taskForm.get('title')?.invalid && taskForm.get('title')?.touched"
                />
                <div *ngIf="taskForm.get('title')?.invalid && taskForm.get('title')?.touched" class="mt-1 text-sm text-red-600">
                  Le titre est obligatoire
                </div>
              </div>

              <!-- Description -->
              <div>
                <label for="description" class="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  formControlName="description"
                  rows="4"
                  placeholder="Décrivez en détail ce qui doit être fait..."
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                ></textarea>
              </div>

              <!-- Projet et tâche parente -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Projet -->
                <div>
                  <label for="project_id" class="block text-sm font-medium text-gray-700 mb-2">
                    Projet *
                  </label>
                  <select
                    id="project_id"
                    formControlName="project_id"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    [class.border-red-300]="taskForm.get('project_id')?.invalid && taskForm.get('project_id')?.touched"
                  >
                    <option value="">Sélectionnez un projet</option>
                    <option *ngFor="let project of availableProjects()" [value]="project.id">
                      {{ project.name }}
                    </option>
                  </select>
                  <div *ngIf="taskForm.get('project_id')?.invalid && taskForm.get('project_id')?.touched" class="mt-1 text-sm text-red-600">
                    Le projet est obligatoire
                  </div>
                </div>

                <!-- Tâche parente -->
                <div>
                  <label for="parent_task_id" class="block text-sm font-medium text-gray-700 mb-2">
                    Tâche parente (optionnel)
                  </label>
                  <select
                    id="parent_task_id"
                    formControlName="parent_task_id"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="">Aucune tâche parente</option>
                    <option *ngFor="let task of availableParentTasks()" [value]="task.id">
                      {{ task.title }} ({{ task.code }})
                    </option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <!-- Classification -->
          <div class="bg-white shadow-sm rounded-lg border border-gray-200">
            <div class="px-6 py-5 border-b border-gray-200">
              <h3 class="text-lg font-medium text-gray-900">Classification</h3>
              <p class="mt-1 text-sm text-gray-500">Définissez la priorité et le type de tâche</p>
            </div>

            <div class="px-6 py-5 space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <!-- Priorité -->
                <div>
                  <label for="priority" class="block text-sm font-medium text-gray-700 mb-2">
                    Priorité *
                  </label>
                  <select
                    id="priority"
                    formControlName="priority"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="low">Basse</option>
                    <option value="normal">Normale</option>
                    <option value="high">Haute</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>

                <!-- Type -->
                <div>
                  <label for="type" class="block text-sm font-medium text-gray-700 mb-2">
                    Type *
                  </label>
                  <select
                    id="type"
                    formControlName="type"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="feature">Fonctionnalité</option>
                    <option value="bug">Correction de bug</option>
                    <option value="improvement">Amélioration</option>
                    <option value="documentation">Documentation</option>
                    <option value="test">Test</option>
                    <option value="research">Recherche</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>

                <!-- Estimation -->
                <div>
                  <label for="estimated_hours" class="block text-sm font-medium text-gray-700 mb-2">
                    Estimation (heures)
                  </label>
                  <input
                    type="number"
                    id="estimated_hours"
                    formControlName="estimated_hours"
                    min="0"
                    step="0.5"
                    placeholder="Ex: 8"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Planification -->
          <div class="bg-white shadow-sm rounded-lg border border-gray-200">
            <div class="px-6 py-5 border-b border-gray-200">
              <h3 class="text-lg font-medium text-gray-900">Planification</h3>
              <p class="mt-1 text-sm text-gray-500">Définissez les dates et assignations</p>
            </div>

            <div class="px-6 py-5 space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Date d'échéance -->
                <div>
                  <label for="due_date" class="block text-sm font-medium text-gray-700 mb-2">
                    Date d'échéance
                  </label>
                  <input
                    type="date"
                    id="due_date"
                    formControlName="due_date"
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>

                <!-- Assigné à -->
                <div>
                  <label for="assigned_to" class="block text-sm font-medium text-gray-700 mb-2">
                    Assigné à
                  </label>
                  <select
                    id="assigned_to"
                    formControlName="assigned_to"
                    multiple
                    class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  >
                    <option *ngFor="let user of availableUsers()" [value]="user.id">
                      {{ user.first_name }} {{ user.last_name }} ({{ user.email }})
                    </option>
                  </select>
                  <p class="mt-1 text-sm text-gray-500">
                    Maintenez Ctrl (Cmd sur Mac) pour sélectionner plusieurs utilisateurs
                  </p>
                </div>
              </div>

              <!-- Tags -->
              <div>
                <label for="tags" class="block text-sm font-medium text-gray-700 mb-2">
                  Tags (séparés par des virgules)
                </label>
                <input
                  type="text"
                  id="tags"
                  formControlName="tags"
                  placeholder="Ex: frontend, urgent, client"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
                <p class="mt-1 text-sm text-gray-500">
                  Séparez les tags par des virgules. Ils seront créés automatiquement s'ils n'existent pas.
                </p>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-between pt-6">
            <button
              type="button"
              (click)="resetForm()"
              class="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              Réinitialiser
            </button>

            <div class="flex space-x-3">
              <button
                type="button"
                (click)="saveAsDraft()"
                [disabled]="isSubmitting()"
                class="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Sauvegarder comme brouillon
              </button>

              <button
                type="submit"
                [disabled]="taskForm.invalid || isSubmitting()"
                class="inline-flex items-center px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                <svg *ngIf="isSubmitting()" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ isSubmitting() ? 'Création en cours...' : 'Créer la tâche' }}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  `
})
export class TaskCreateComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private tasksService = inject(TasksApiService);
  private projectsService = inject(ProjectsApiService);
  private loggingService = inject(LoggingService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // État du composant
  availableProjects = signal<Project[]>([]);
  availableParentTasks = signal<Task[]>([]);
  availableUsers = signal<UserEntity[]>([]);
  isSubmitting = signal(false);
  error = signal<string | null>(null);

  // Formulaire
  taskForm: FormGroup;

  constructor() {
    this.taskForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(255)]],
      description: [''],
      project_id: ['', [Validators.required]],
      parent_task_id: [''],
      priority: ['normal', [Validators.required]],
      type: ['feature', [Validators.required]],
      estimated_hours: [''],
      due_date: [''],
      assigned_to: [[]],
      tags: ['']
    });
  }

  ngOnInit(): void {
    this.loadInitialData();
    this.setupFormSubscriptions();

    // Vérifier les paramètres de l'URL
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['project_id']) {
        this.taskForm.patchValue({ project_id: params['project_id'] });
      }
      if (params['parent_task_id']) {
        this.taskForm.patchValue({ parent_task_id: params['parent_task_id'] });
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupFormSubscriptions(): void {
    // Charger les tâches du projet quand le projet change
    this.taskForm.get('project_id')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(projectId => {
        if (projectId) {
          this.loadProjectTasks(projectId);
        } else {
          this.availableParentTasks.set([]);
        }
      });
  }

  private loadInitialData(): void {
    // Charger les projets
    this.projectsService.getProjects()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.availableProjects.set(response.data);
        },
        error: (error) => {
          this.loggingService.error('Failed to load projects', {
            component: 'TaskCreateComponent',
            action: 'loadInitialData',
            data: { error: error.message }
          });
        }
      });

    // Charger les utilisateurs
    // Note: Adaptez cette méthode selon votre service utilisateurs
    // this.usersService.getUsers()
    //   .pipe(takeUntil(this.destroy$))
    //   .subscribe({
    //     next: (users) => {
    //       this.availableUsers.set(users);
    //     },
    //     error: (error) => {
    //       this.loggingService.error('Failed to load users', error);
    //     }
    //   });
  }

  private loadProjectTasks(projectId: number): void {
    this.tasksService.getTasks({ project_id: projectId, status: 'todo,in_progress' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.availableParentTasks.set(response.data);
        },
        error: (error) => {
          this.loggingService.error('Failed to load project tasks', {
            component: 'TaskCreateComponent',
            action: 'loadProjectTasks',
            data: { error: error.message, projectId }
          });
        }
      });
  }

  onSubmit(): void {
    if (this.taskForm.valid && !this.isSubmitting()) {
      this.createTask('todo');
    }
  }

  saveAsDraft(): void {
    if (!this.isSubmitting()) {
      this.createTask('draft');
    }
  }

  private createTask(status: string): void {
    this.isSubmitting.set(true);
    this.error.set(null);

    const formData = this.taskForm.value;

    const createRequest: CreateTaskRequest = {
      title: formData.title,
      description: formData.description || '',
      project_id: formData.project_id,
      parent_task_id: formData.parent_task_id || undefined,
      priority: formData.priority as TaskPriority,
      type: formData.type as TaskType,
      estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : undefined,
      due_date: formData.due_date || undefined,
      status: status as any,
      assigned_to: formData.assigned_to || [],
      tags: formData.tags ? formData.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag) : []
    };

    this.tasksService.createTask(createRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loggingService.info('Task created successfully', {
            component: 'TaskCreateComponent',
            action: 'createTask',
            data: { taskId: response.data.id, taskTitle: response.data.title, status }
          });

          // Rediriger vers la page de détail de la tâche
          this.router.navigate(['/tasks/detail', response.data.id]);
        },
        error: (error) => {
          this.error.set(error.error?.message || 'Erreur lors de la création de la tâche');
          this.isSubmitting.set(false);

          this.loggingService.error('Failed to create task', {
            component: 'TaskCreateComponent',
            action: 'createTask',
            data: { error: error.message, formData: createRequest }
          });
        }
      });
  }

  resetForm(): void {
    this.taskForm.reset({
      priority: 'normal',
      type: 'feature',
      assigned_to: []
    });
    this.error.set(null);
  }

  goBack(): void {
    this.router.navigate(['/tasks']);
  }
}