import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { RoleGuard } from './core/guards/role.guard';
import { PERMISSIONS } from './domain/models/permission.models';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(c => c.LoginComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/layout/layout').then(c => c.DashboardLayoutComponent),
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
      },
      {
        path: 'home',
        loadComponent: () => import('./features/dashboard/pages/dashboard-refined/dashboard-refined.component').then(c => c.DashboardRefinedComponent),
        canActivate: [RoleGuard],
        data: {
          permissions: [PERMISSIONS.DASHBOARD_PERSONAL, PERMISSIONS.SYSTEM_VIEW],
          requireAllPermissions: false
        }
      },
      {
        path: 'clients',
        loadComponent: () => import('./features/dashboard/pages/clients/clients').then(c => c.Clients),
        canActivate: [RoleGuard],
        data: {
          permissions: [PERMISSIONS.CLIENTS_READ]
        }
      },
      {
        path: 'clients/:id',
        loadComponent: () => import('./features/dashboard/pages/client-detail/client-detail.component').then(c => c.ClientDetailComponent),
        canActivate: [RoleGuard],
        data: {
          permissions: [PERMISSIONS.CLIENTS_READ]
        }
      },
      {
        path: 'suppliers',
        loadComponent: () => import('./features/dashboard/pages/suppliers/suppliers').then(c => c.Suppliers),
        canActivate: [RoleGuard],
        data: {
          permissions: [PERMISSIONS.CLIENTS_READ]
        }
      },
      {
        path: 'contacts',
        loadComponent: () => import('./features/dashboard/pages/contacts/contacts').then(c => c.ContactsComponent),
        canActivate: [RoleGuard],
        data: {
          permissions: [PERMISSIONS.CONTACTS_READ]
        }
      },
      {
        path: 'categories',
        loadComponent: () => import('./features/dashboard/pages/categories/categories').then(c => c.CategoriesComponent),
        canActivate: [RoleGuard],
        data: {
          permissions: [PERMISSIONS.SYSTEM_VIEW]
        }
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/dashboard/pages/profile/profile').then(c => c.ProfileComponent)
      },
      // Call Center Sub-Module
      {
        path: 'call-center',
        canActivate: [RoleGuard],
        data: {
          permissions: [PERMISSIONS.CALL_CENTER_ACCESS, PERMISSIONS.DASHBOARD_PERSONAL],
          requireAllPermissions: false
        },
        children: [
          {
            path: '',
            redirectTo: 'dashboard',
            pathMatch: 'full'
          },
          {
            path: 'dashboard',
            loadComponent: () => import('./features/dashboard/pages/call-center/dashboard/call-center-dashboard.component')
              .then(c => c.CallCenterDashboardComponent)
          },
          {
            path: 'create-call',
            loadComponent: () => import('./features/dashboard/pages/call-center/create-call/create-call.component')
              .then(c => c.CreateCallComponent)
          },
          {
            path: 'calls/:id',
            loadComponent: () => import('./features/dashboard/pages/call-center/call-details/call-details.component')
              .then(c => c.CallDetailsComponent)
          },
          {
            path: 'search',
            loadComponent: () => import('./features/dashboard/pages/call-center/search-calls/search-calls.component')
              .then(c => c.SearchCallsComponent)
          },
          {
            path: 'department-queue',
            loadComponent: () => import('./features/dashboard/pages/call-center/department-queue/department-queue.component')
              .then(c => c.DepartmentQueueComponent)
          },
          {
            path: 'callbacks',
            loadComponent: () => import('./features/dashboard/pages/call-center/callbacks/callbacks-list.component')
              .then(c => c.CallbacksListComponent)
          },
          {
            path: 'daily-report',
            loadComponent: () => import('./features/dashboard/pages/call-center/daily-report/daily-report.component')
              .then(c => c.DailyReportComponent)
          },
        ]
      },
      {
        path: 'complaints',
        canActivate: [RoleGuard],
        data: {
          // MATCH the permissions here as well
          permissions: [PERMISSIONS.CALL_CENTER_ACCESS, PERMISSIONS.DASHBOARD_PERSONAL],
          requireAllPermissions: false // This ensures EITHER permission works
        },
        children: [
          {
            path: '',
            loadComponent: () => import('./features/dashboard/pages/complaints/complaints-list/complaints-list.component')
              .then(m => m.ComplaintsListComponent),
            title: 'Gestion des Réclamations'
          },
          {
            path: ':id',
            loadComponent: () => import('./features/dashboard/pages/complaints/complaint-details/complaint-details.component')
              .then(m => m.ComplaintDetailsComponent),
            title: 'Détails de la Réclamation'
          }
        ]
      },
      {
        path: 'ringover-history',
        loadComponent: () => import('./features/dashboard/pages/call-center/ringover-history/ringover-history.component')
          .then(c => c.RingoverHistoryComponent)
      },
      {
        path: 'supervisor',
        canActivate: [RoleGuard],
        data: {
          // Only users with supervisor or manager permissions can enter
          permissions: [PERMISSIONS.CALL_CENTER_SUPERVISOR, PERMISSIONS.CALL_CENTER_MANAGER, PERMISSIONS.CALL_CENTER_ADMIN],
          requireAllPermissions: false
        },
        children: [
          {
            path: '',
            redirectTo: 'dashboard',
            pathMatch: 'full'
          },
          {
            path: 'dashboard',
            loadComponent: () => import('./features/dashboard/pages/supervisor/dashboard/dashboard.component')
              .then(c => c.SupervisorDashboardComponent)
          },
          {
            path: 'stats',
            loadComponent: () => import('./features/dashboard/pages/supervisor/stats/stats.component')
              .then(c => c.SupervisorStatsComponent)
          },
          {
            path: 'complaints',
            loadComponent: () => import('./features/dashboard/pages/supervisor/complaints/complaints.component')
              .then(c => c.SupervisorComplaintsComponent)
          },
        ]
      },
      {
        path: 'manager',
        canActivate: [RoleGuard],
        data: {
          permissions: [PERMISSIONS.CALL_CENTER_MANAGER, PERMISSIONS.CALL_CENTER_ADMIN],
          requireAllPermissions: false
        },
        children: [
          {
            path: '',
            redirectTo: 'analytics',
            pathMatch: 'full'
          },
          {
            path: 'analytics',
            loadComponent: () => import('./features/dashboard/pages/manager/analytics.component')
              .then(c => c.AnalyticsComponent)
          }
        ]
      }
    ]
  },
  {
    path: 'settings',
    loadComponent: () => import('./features/settings/settings-layout.component').then(c => c.SettingsLayoutComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: {
      permissions: [PERMISSIONS.SYSTEM_VIEW]
    },
    children: [
      {
        path: '',
        redirectTo: 'my-permissions',
        pathMatch: 'full'
      },
      {
        path: 'my-permissions',
        loadComponent: () => import('./features/settings/pages/my-permissions.component').then(c => c.MyPermissionsComponent)
      },
      {
        path: 'user-management',
        loadComponent: () => import('./features/settings/user-management/user-management.component').then(c => c.UserManagementComponent),
        canActivate: [RoleGuard],
        data: {
          permissions: [PERMISSIONS.USERS_READ]
        }
      },
      {
        path: 'roles-management',
        loadComponent: () => import('./features/settings/pages/roles-management.component').then(c => c.RolesManagementComponent),
        canActivate: [RoleGuard],
        data: {
          permissions: [PERMISSIONS.ROLES_READ]
        }
      },
      {
        path: 'permissions-management',
        loadComponent: () => import('./features/settings/pages/permissions-management.component').then(c => c.PermissionsManagementComponent),
        canActivate: [RoleGuard],
        data: {
          permissions: [PERMISSIONS.PERMISSIONS_READ]
        }
      },
      {
        path: 'users-roles',
        loadComponent: () => import('./features/settings/pages/users-roles.component').then(c => c.UsersRolesComponent),
        canActivate: [RoleGuard],
        data: {
          permissions: [PERMISSIONS.ROLES_ASSIGN]
        }
      }
    ]
  },
  {
    path: 'unauthorized',
    loadComponent: () => import('./features/shared/pages/unauthorized.component').then(c => c.UnauthorizedComponent)
  },
  {
    path: '**',
    redirectTo: '/login'
  }
];