// ========================================
// PAGE LISTE DES PROJETS
// Liste complète des projets avec filtrage et pagination
// ========================================

import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import {
  Project,
  ProjectFilters,
  PaginatedProjectResponse,
  canEditProject
} from '../../models/project.models';
import { ProjectsApiService } from '../../services/projects-api.service';
import { ProjectListComponent } from '../../components/project-list/project-list.component';
import { AuthFacade } from '../../../auth/auth.facade';
import { UserEntity } from '../../../../domain/entities/user.entity';

@Component({
  selector: 'app-projects-list',
  standalone: true,
  imports: [CommonModule, ProjectListComponent],
  template: `
    <div class="projects-list-page">
      <app-project-list
        [projects]="projects()"
        [loading]="loading()"
        [pagination]="pagination()"
        [initialFilters]="currentFilters"
        [canEdit]="canEditProject"
        [canDelete]="canDeleteProject"
        title="Liste des projets"
        (onFilterChange)="handleFilterChange($event)"
        (onPageChange)="handlePageChange($event)"
        (onCreateProject)="handleCreateProject()"
        (onEditProject)="handleEditProject($event)"
        (onDeleteProject)="handleDeleteProject($event)"
        (onDuplicateProject)="handleDuplicateProject($event)"
        (onViewDetails)="handleViewDetails($event)"
        (onManageTeam)="handleManageTeam($event)"
      />
    </div>
  `
})
export class ProjectsListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Signaux pour l'état du composant
  projects = signal<Project[]>([]);
  loading = signal(true);
  pagination = signal<PaginatedProjectResponse['meta'] | null>(null);
  currentUser = signal<UserEntity | null>(null);

  currentFilters: ProjectFilters = {};
  currentPage = 1;
  perPage = 15;

  constructor(
    private projectsApiService: ProjectsApiService,
    private authFacade: AuthFacade,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Récupérer l'utilisateur actuel
    this.authFacade.user$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(user => {
      this.currentUser.set(user);
    });

    // Charger les filtres depuis les query params
    this.route.queryParams.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      this.currentFilters = {
        status: params['status'] || '',
        department: params['department'] || '',
        my_projects: params['my_projects'] === 'true',
        active_only: params['active_only'] === 'true',
        search: params['search'] || ''
      };
      this.loadProjects();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadProjects(): void {
    this.loading.set(true);

    this.projectsApiService.getProjects(this.currentFilters, this.currentPage, this.perPage)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.projects.set(response.data || []);
          this.pagination.set(response.meta);
          this.loading.set(false);
        },
        error: (error) => {
          console.error('Erreur lors du chargement des projets:', error);
          this.loading.set(false);
        }
      });
  }

  handleFilterChange(filters: ProjectFilters): void {
    this.currentFilters = filters;
    this.currentPage = 1;

    // Mettre à jour l'URL avec les nouveaux filtres
    this.router.navigate([], {
      queryParams: filters,
      queryParamsHandling: 'merge'
    });
  }

  handlePageChange(page: number): void {
    this.currentPage = page;
    this.loadProjects();
  }

  handleCreateProject(): void {
    this.router.navigate(['/dashboard/projects/create']);
  }

  handleEditProject(project: Project): void {
    this.router.navigate(['/dashboard/projects/detail', project.id]);  // TODO: Create edit route
  }

  handleDeleteProject(project: Project): void {
    if (confirm(`Êtes-vous sûr de vouloir supprimer le projet "${project.name}" ?`)) {
      this.projectsApiService.deleteProject(project.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadProjects(); // Recharger la liste
          },
          error: (error) => {
            alert('Erreur lors de la suppression: ' + error.message);
          }
        });
    }
  }

  handleDuplicateProject(project: Project): void {
    this.projectsApiService.duplicateProject(project.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.data) {
            this.router.navigate(['/projects/detail', response.data.id]);
          }
        },
        error: (error) => {
          alert('Erreur lors de la duplication: ' + error.message);
        }
      });
  }

  handleViewDetails(project: Project): void {
    this.router.navigate(['/dashboard/projects/detail', project.id]);
  }

  handleManageTeam(project: Project): void {
    this.router.navigate(['/dashboard/projects/detail', project.id]);  // TODO: Add team tab support
  }

  canEditProject = (project: Project): boolean => {
    const user = this.currentUser();
    return user ? canEditProject(project, user) : false;
  };

  canDeleteProject = (project: Project): boolean => {
    // Seuls les projets annulés peuvent être supprimés
    return project.status === 'annule' && this.canEditProject(project);
  };
}