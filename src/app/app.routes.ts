import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { RoleGuard } from './core/guards/role.guard';
import { PERMISSIONS } from './domain/models/permission.models';
import { loadComponent } from './core/helpers/route-loader.helper';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: loadComponent(
      () => import('./features/auth/login/login.component').then(c => c.LoginComponent),
      'LoginComponent'
    )
  },
  {
    path: 'dashboard',
    loadComponent: loadComponent(
      () => import('./features/dashboard/layout/layout').then(c => c.DashboardLayoutComponent),
      'DashboardLayoutComponent'
    ),
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
      },
      {
        path: 'home',
        loadComponent: loadComponent(
          () => import('./features/dashboard/pages/dashboard-refined/dashboard-refined.component').then(c => c.DashboardRefinedComponent),
          'DashboardRefinedComponent'
        ),
        canActivate: [RoleGuard],
        data: {
          permissions: [PERMISSIONS.DASHBOARD_PERSONAL, PERMISSIONS.SYSTEM_VIEW],
          requireAllPermissions: false
        }
      },
      {
        path: 'clients',
        loadComponent: loadComponent(
          () => import('./features/dashboard/pages/clients/clients').then(c => c.Clients),
          'ClientsComponent'
        ),
        canActivate: [RoleGuard],
        data: {
          permissions: [PERMISSIONS.CLIENTS_READ, PERMISSIONS.CLIENTS_READ_TEAM],
          requireAllPermissions: false
        }
      },
      {
        path: 'clients/:id',
        loadComponent: loadComponent(
          () => import('./features/dashboard/pages/client-detail/client-detail.component').then(c => c.ClientDetailComponent),
          'ClientDetailComponent'
        ),
        canActivate: [RoleGuard],
        data: {
          permissions: [PERMISSIONS.CLIENTS_READ, PERMISSIONS.CLIENTS_READ_TEAM],
          requireAllPermissions: false
        }
      },
      {
        path: 'suppliers',
        loadComponent: loadComponent(
          () => import('./features/dashboard/pages/suppliers/suppliers').then(c => c.Suppliers),
          'SuppliersComponent'
        ),
        canActivate: [RoleGuard],
        data: {
          permissions: [PERMISSIONS.SUPPLIERS_READ_ALL, PERMISSIONS.SUPPLIERS_READ_TEAM, PERMISSIONS.SUPPLIERS_VIEW_LEGACY],
          requireAllPermissions: false
        }
      },
      {
        path: 'contacts',
        loadComponent: loadComponent(
          () => import('./features/dashboard/pages/contacts/contacts').then(c => c.ContactsComponent),
          'ContactsComponent'
        ),
        canActivate: [RoleGuard],
        data: {
          permissions: [PERMISSIONS.CONTACTS_READ],
          requireAllPermissions: false
        }
      },
      {
        path: 'categories',
        loadComponent: loadComponent(
          () => import('./features/dashboard/pages/categories/categories').then(c => c.CategoriesComponent),
          'CategoriesComponent'
        ),
        canActivate: [RoleGuard],
        data: {
          permissions: [PERMISSIONS.SYSTEM_VIEW]
        }
      },
      {
        path: 'profile',
        loadComponent: loadComponent(
          () => import('./features/dashboard/pages/profile/profile').then(c => c.ProfileComponent),
          'ProfileComponent'
        )
      },
    ]
  },
  {
    path: 'settings',
    loadComponent: loadComponent(
      () => import('./features/settings/settings-layout.component').then(c => c.SettingsLayoutComponent),
      'SettingsLayoutComponent'
    ),
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        redirectTo: 'my-permissions',
        pathMatch: 'full'
      },
      {
        path: 'my-permissions',
        loadComponent: loadComponent(
          () => import('./features/settings/pages/my-permissions.component').then(c => c.MyPermissionsComponent),
          'MyPermissionsComponent'
        )
      },
      // Routes Admin - Basées sur les endpoints disponibles
      {
        path: 'user-management',
        loadComponent: loadComponent(
          () => import('./features/settings/user-management/user-management.component').then(c => c.UserManagementComponent),
          'UserManagementComponent'
        ),
        canActivate: [RoleGuard],
        data: {
          permissions: [PERMISSIONS.USERS_READ]
        }
      },
      {
        path: 'roles-management',
        loadComponent: loadComponent(
          () => import('./features/settings/pages/roles-management.component').then(c => c.RolesManagementComponent),
          'RolesManagementComponent'
        ),
        canActivate: [RoleGuard],
        data: {
          permissions: [PERMISSIONS.ROLES_READ]
        }
      },
      {
        path: 'permissions-management',
        loadComponent: loadComponent(
          () => import('./features/settings/pages/permissions-management.component').then(c => c.PermissionsManagementComponent),
          'PermissionsManagementComponent'
        ),
        canActivate: [RoleGuard],
        data: {
          permissions: [PERMISSIONS.PERMISSIONS_READ]
        }
      },
      {
        path: 'users-roles',
        loadComponent: loadComponent(
          () => import('./features/settings/pages/users-roles.component').then(c => c.UsersRolesComponent),
          'UsersRolesComponent'
        ),
        canActivate: [RoleGuard],
        data: {
          permissions: [PERMISSIONS.ROLES_ASSIGN]
        }
      }
    ]
  },
  {
    path: 'unauthorized',
    loadComponent: loadComponent(
      () => import('./features/shared/pages/unauthorized.component').then(c => c.UnauthorizedComponent),
      'UnauthorizedComponent'
    )
  },
  {
    path: '**',
    loadComponent: loadComponent(
      () => import('./shared/components/page-not-found/page-not-found').then(c => c.PageNotFound),
      'PageNotFoundComponent'
    )
  }
];