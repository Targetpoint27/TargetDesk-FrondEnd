import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-md w-full">
        <div class="bg-white py-8 px-6 shadow rounded-lg sm:px-10">
          <div class="text-center">
            <div class="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-red-100 mb-6">
              <i class="bi bi-shield-exclamation text-3xl text-red-600"></i>
            </div>

            <h1 class="text-3xl font-extrabold text-gray-900 mb-2">
              Accès refusé
            </h1>

            <p class="text-lg text-gray-600 mb-8">
              Vous n'avez pas les permissions nécessaires pour accéder à cette page.
            </p>

            <div class="space-y-4">
              <button
                (click)="goBack()"
                class="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
                <i class="bi bi-arrow-left mr-2"></i>
                Retour
              </button>

              <button
                (click)="goToDashboard()"
                class="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
                <i class="bi bi-house-door mr-2"></i>
                Aller au tableau de bord
              </button>
            </div>

            <div class="mt-8 text-center">
              <p class="text-sm text-gray-500">
                Si vous pensez qu'il s'agit d'une erreur, contactez votre administrateur.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class UnauthorizedComponent {

  constructor(private router: Router) {}

  goBack(): void {
    window.history.back();
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}