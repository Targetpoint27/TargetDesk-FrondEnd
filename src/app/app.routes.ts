import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

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
    path: 'register',
    loadComponent: () => import('./features/auth/register/register.component').then(c => c.RegisterComponent)
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
        loadComponent: () => import('./features/dashboard/pages/dashboard-home/dashboard-home').then(c => c.DashboardHome)
      },
      {
        path: 'clients',
        loadComponent: () => import('./features/dashboard/pages/clients/clients').then(c => c.Clients)
      },
      {
        path: 'clients/:id',
        loadComponent: () => import('./features/dashboard/pages/client-detail/client-detail.component').then(c => c.ClientDetailComponent)
      },
      {
        path: 'suppliers',
        loadComponent: () => import('./features/dashboard/pages/suppliers/suppliers').then(c => c.Suppliers)
      },
      {
        path: 'contacts',
        loadComponent: () => import('./features/dashboard/pages/contacts/contacts').then(c => c.ContactsComponent)
      },
      {
        path: 'categories',
        loadComponent: () => import('./features/dashboard/pages/categories/categories').then(c => c.CategoriesComponent)
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/dashboard/pages/profile/profile').then(c => c.ProfileComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: '/login'
  }
];