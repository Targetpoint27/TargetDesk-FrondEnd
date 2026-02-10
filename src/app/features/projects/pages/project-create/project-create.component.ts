// ========================================
// PAGE CRÉATION DE PROJET
// Formulaire de création d'un nouveau projet
// ========================================

import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import {
  CreateProjectRequest
} from '../../models/project.models';
import { ProjectsApiService } from '../../services/projects-api.service';
import { ProjectFormComponent } from '../../components/project-form/project-form.component';
import { UserEntity } from '../../../../domain/entities/user.entity';
import { ClientEntity } from '../../../../domain/entities/client.entity';

// Import des services réels
import { ApiService } from '../../../../core/api/api.service';

@Component({
  selector: 'app-project-create',
  standalone: true,
  imports: [CommonModule, ProjectFormComponent],
  template: `
    <div class="project-create-page">
      <!-- Navigation breadcrumb -->
      <nav class="mb-6">
        <ol class="flex items-center space-x-2 text-sm text-gray-500">
          <li>
            <a routerLink="/dashboard/projects/dashboard" class="hover:text-gray-700">Projets</a>
          </li>
          <li class="flex items-center">
            <svg class="w-4 h-4 mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
            <span class="text-gray-900 font-medium">Nouveau projet</span>
          </li>
        </ol>
      </nav>

      <!-- Message d'erreur global -->
      @if (error()) {
        <div class="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div class="flex">
            <svg class="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <div class="ml-3">
              <p class="text-sm text-red-800">{{ error() }}</p>
            </div>
          </div>
        </div>
      }

      <!-- État de chargement -->
      @if (loadingDependencies()) {
        <div class="flex items-center justify-center py-12">
          <div class="flex items-center space-x-2">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span class="text-gray-600">Chargement du formulaire...</span>
          </div>
        </div>
      } @else {
        <!-- Formulaire de création -->
        <app-project-form
          [availableManagers]="availableManagers()"
          [availableClients]="availableClients()"
          [loading]="submitting()"
          (onSubmit)="handleSubmit($event)"
          (onCancel)="handleCancel()"
        />
      }
    </div>
  `
})
export class ProjectCreateComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Signaux pour l'état du composant
  availableManagers = signal<UserEntity[]>([]);
  availableClients = signal<ClientEntity[]>([]);
  loadingDependencies = signal(true);
  submitting = signal(false);
  error = signal('');

  constructor(
    private projectsApiService: ProjectsApiService,
    private apiService: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadFormDependencies();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadFormDependencies(): void {
    this.loadingDependencies.set(true);
    this.error.set('');

    // Charger en parallèle les utilisateurs (managers) et les clients via l'API
    Promise.all([
      this.apiService.get<{data: UserEntity[]}>('users?role=project_manager').toPromise(),
      this.apiService.get<{data: ClientEntity[]}>('clients?active=true').toPromise()
    ]).then(([managersResponse, clientsResponse]) => {
      this.availableManagers.set(managersResponse?.data || []);
      this.availableClients.set(clientsResponse?.data || []);
      this.loadingDependencies.set(false);
    }).catch(error => {
      console.error('Erreur lors du chargement des dépendances:', error);
      this.availableManagers.set([]);
      this.availableClients.set([]);
      this.loadingDependencies.set(false);
      this.error.set('Erreur lors du chargement des données du formulaire');
    });
  }

  handleSubmit(projectData: any): void {
    this.submitting.set(true);
    this.error.set('');

    // Appel direct à l'API - la validation sera faite côté serveur
    this.projectsApiService.createProject(projectData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.data) {
            // Succès - rediriger vers la page de détails du projet créé
            this.router.navigate(['/dashboard/projects', response.data.id]);
          } else {
            this.error.set('Erreur lors de la création du projet');
            this.submitting.set(false);
          }
        },
        error: (error) => {
          this.error.set(error.message || 'Erreur lors de la création du projet');
          this.submitting.set(false);
        }
      });
  }

  handleCancel(): void {
    // Retour au tableau de bord des projets
    this.router.navigate(['/dashboard/projects/dashboard']);
  }
}