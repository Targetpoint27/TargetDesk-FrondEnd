// ========================================
// ROUTES POUR LE MODULE PROJETS
// Basé sur GESTION_PROJETS_API_DOCUMENTATION.md
// ========================================

import { Routes } from '@angular/router';
import { RoleGuard } from '../../core/guards/role.guard';
import { PERMISSIONS } from '../../domain/models/permission.models';

export const PROJECTS_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/projects-dashboard/projects-dashboard.component').then(c => c.ProjectsDashboardComponent),
    canActivate: [RoleGuard],
    data: {
      permissions: [PERMISSIONS.SYSTEM_VIEW],
      title: 'Tableau de bord - Projets'
    }
  },
  {
    path: 'list',
    loadComponent: () => import('./pages/projects-list/projects-list.component').then(c => c.ProjectsListComponent),
    canActivate: [RoleGuard],
    data: {
      permissions: [PERMISSIONS.SYSTEM_VIEW],
      title: 'Liste des projets'
    }
  },
  {
    path: 'create',
    loadComponent: () => import('./pages/project-create/project-create.component').then(c => c.ProjectCreateComponent),
    canActivate: [RoleGuard],
    data: {
      permissions: [PERMISSIONS.SYSTEM_VIEW],
      title: 'Nouveau projet'
    }
  },
  {
    path: 'detail/:id',
    loadComponent: () => import('./components/project-detail/project-detail.component').then(c => c.ProjectDetailComponent),
    data: {
      title: 'Détails du projet'
    }
  },
  {
    path: 'statistics',
    loadComponent: () => import('./pages/projects-statistics/projects-statistics.component').then(c => c.ProjectsStatisticsComponent),
    canActivate: [RoleGuard],
    data: {
      permissions: [PERMISSIONS.SYSTEM_VIEW],
      title: 'Statistiques des projets'
    }
  },
  {
    path: 'my-projects',
    loadComponent: () => import('./pages/my-projects/my-projects.component').then(c => c.MyProjectsComponent),
    canActivate: [RoleGuard],
    data: {
      permissions: [PERMISSIONS.SYSTEM_VIEW],
      title: 'Mes projets'
    }
  }
];