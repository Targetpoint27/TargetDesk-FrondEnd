// ========================================
// ROUTES POUR LE MODULE TÂCHES
// Basé sur GESTION_TACHES_API_DOCUMENTATION.md
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
    canActivate: [RoleGuard],
    data: {
      permissions: [PERMISSIONS.SYSTEM_VIEW],
      title: 'Liste des tâches'
    }
  },
  {
    path: 'my-tasks',
    loadComponent: () => import('./pages/my-tasks/my-tasks.component').then(c => c.MyTasksComponent),
    canActivate: [RoleGuard],
    data: {
      permissions: [PERMISSIONS.SYSTEM_VIEW],
      title: 'Mes tâches'
    }
  },
  {
    path: 'create',
    loadComponent: () => import('./pages/task-create/task-create.component').then(c => c.TaskCreateComponent),
    canActivate: [RoleGuard],
    data: {
      permissions: [PERMISSIONS.SYSTEM_VIEW],
      title: 'Nouvelle tâche'
    }
  },
  {
    path: 'detail/:id',
    loadComponent: () => import('./pages/task-detail/task-detail.component').then(c => c.TaskDetailComponent),
    canActivate: [RoleGuard],
    data: {
      permissions: [PERMISSIONS.SYSTEM_VIEW],
      title: 'Détails de la tâche'
    }
  },
  {
    path: 'edit/:id',
    loadComponent: () => import('./pages/task-edit/task-edit.component').then(c => c.TaskEditComponent),
    canActivate: [RoleGuard],
    data: {
      permissions: [PERMISSIONS.SYSTEM_VIEW],
      title: 'Modifier la tâche'
    }
  },
  {
    path: 'overdue',
    loadComponent: () => import('./pages/overdue-tasks/overdue-tasks.component').then(c => c.OverdueTasksComponent),
    canActivate: [RoleGuard],
    data: {
      permissions: [PERMISSIONS.SYSTEM_VIEW],
      title: 'Tâches en retard'
    }
  },
  {
    path: 'time-tracking',
    loadComponent: () => import('./pages/time-tracking/time-tracking.component').then(c => c.TimeTrackingComponent),
    canActivate: [RoleGuard],
    data: {
      permissions: [PERMISSIONS.SYSTEM_VIEW],
      title: 'Suivi du temps'
    }
  }
];