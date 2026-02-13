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

    // Charger en parallèle les utilisateurs et les clients via l'API
    Promise.all([
      this.apiService.get('users').toPromise(),
      this.apiService.get('clients').toPromise()
    ]).then(([managersResponse, clientsResponse]) => {
      // Traiter les utilisateurs - Structure: { success: true, data: { data: [...] } }
      let managers: UserEntity[] = [];
      if (managersResponse && typeof managersResponse === 'object' && 'success' in managersResponse && managersResponse.success) {
        const responseData = (managersResponse as any).data;
        if (responseData && 'data' in responseData && Array.isArray(responseData.data)) {
          // Créer des UserEntity à partir des données brutes
          managers = responseData.data.map((userData: any) => {
            return UserEntity.create({
              id: userData.id?.toString() || '',
              name: userData.name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim(),
              email: userData.email || '',
              emailVerified: userData.email_verified_at !== null,
              createdAt: new Date(userData.created_at || Date.now()),
              updatedAt: new Date(userData.updated_at || Date.now())
            });
          });
        }
      }

      // Traiter les clients - Structure: { success: true, data: { clients: [...] } }
      let clients: ClientEntity[] = [];
      if (clientsResponse && typeof clientsResponse === 'object' && 'success' in clientsResponse && clientsResponse.success) {
        const responseData = (clientsResponse as any).data;
        if (responseData && 'clients' in responseData && Array.isArray(responseData.clients)) {
          // Créer des ClientEntity à partir des données brutes
          clients = responseData.clients.map((clientData: any) => {
            return ClientEntity.create({
              id: clientData.id,
              clientId: clientData.client_id,
              name: clientData.name,
              type: clientData.type,
              email: clientData.email,
              phone: clientData.phone,
              address: clientData.address,
              siret: clientData.siret,
              sector: clientData.sector,
              website: clientData.website,
              notes: clientData.notes,
              isActive: clientData.is_active,
              createdBy: clientData.created_by,
              createdAt: new Date(clientData.created_at),
              updatedAt: new Date(clientData.updated_at),
              creator: clientData.creator
            });
          });
        }
      }

      this.availableManagers.set(managers);
      this.availableClients.set(clients);
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

    // Créer le projet via l'API
    this.apiService.post('projects', projectData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response && response.data) {
            // Succès - rediriger vers la liste des projets
            this.router.navigate(['/dashboard/projects/dashboard']);
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