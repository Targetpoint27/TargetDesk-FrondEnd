// ========================================
// ROUTES TIME TRACKING
// Configuration du routage pour le module de suivi du temps
// ========================================

import { Routes } from '@angular/router';

export const timeTrackingRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/time-tracking/time-tracking.component').then(m => m.TimeTrackingComponent),
    title: 'Suivi du Temps'
  },
  {
    path: 'history',
    loadComponent: () => import('./pages/time-history/time-history.component').then(m => m.TimeHistoryComponent),
    title: 'Historique du Temps'
  },
  {
    path: 'analytics',
    loadComponent: () => import('./pages/time-analytics/time-analytics.component').then(m => m.TimeAnalyticsComponent),
    title: 'Analytics du Temps'
  },
  {
    path: 'reports',
    loadComponent: () => import('./pages/time-reports/time-reports.component').then(m => m.TimeReportsComponent),
    title: 'Rapports de Temps'
  }
];