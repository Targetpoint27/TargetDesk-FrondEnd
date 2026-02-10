// ========================================
// ROUTES POUR LE MODULE TÂCHES
// Basé sur DOCUMENTATION_INTEGRATION_API.md
// ========================================

import { Routes } from '@angular/router';
import { RoleGuard } from '../../core/guards/role.guard';
import { PERMISSIONS } from '../../domain/models/permission.models';

export const TASKS_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full'
  },
  {
    path: 'list',
    loadComponent: () => import('./pages/tasks-list/tasks-list.component').then(c => c.TasksListComponent),
    data: {
      title: 'Liste des tâches'
    }
  },
  {
    path: 'my-tasks',
    loadComponent: () => import('./pages/my-tasks/my-tasks.component').then(c => c.MyTasksComponent),
    data: {
      title: 'Mes tâches'
    }
  },
  {
    path: 'detail/:id',
    loadComponent: () => import('./pages/task-detail/task-detail.component').then(c => c.TaskDetailComponent),
    data: {
      title: 'Détails de la tâche'
    }
  },
  {
    path: 'create',
    loadComponent: () => import('./pages/task-create/task-create.component').then(c => c.TaskCreateComponent),
    data: {
      title: 'Nouvelle tâche'
    }
  },
  {
    path: 'time-tracking',
    loadComponent: () => import('./pages/time-tracking/time-tracking.component').then(c => c.TimeTrackingComponent),
    data: {
      title: 'Suivi du temps'
    }
  }
];