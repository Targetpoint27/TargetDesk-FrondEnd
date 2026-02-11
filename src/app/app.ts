import { Component, signal, OnInit } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { ToastContainer } from './shared/components/toast-container/toast-container';
import { ChunkErrorHandlerService } from './core/services/chunk-error-handler.service';
import { preloadCriticalRoutes } from './core/helpers/route-loader.helper';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastContainer],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('targetdesk-frontend');

  constructor(
    private chunkErrorHandler: ChunkErrorHandlerService,
    private router: Router
  ) {
    this.setupRouterErrorHandling();
  }

  ngOnInit(): void {
    console.log('[App] ChunkErrorHandler initialized');

    // Précharger les routes critiques pour éviter les erreurs de chargement
    this.preloadCriticalComponents();

    // Vérifier la santé de l'application
    this.performHealthCheck();
  }

  private setupRouterErrorHandling(): void {
    // Gestion globale des erreurs de navigation via les événements du router
    this.router.events.subscribe(event => {
      // La gestion des erreurs se fait déjà dans le ChunkErrorHandler
    });
  }

  private async preloadCriticalComponents(): Promise<void> {
    try {
      await preloadCriticalRoutes();
    } catch (error) {
      console.warn('[App] Failed to preload critical routes:', error);
    }
  }

  private async performHealthCheck(): Promise<void> {
    try {
      const isHealthy = await this.chunkErrorHandler.checkHealth();
      console.log('[App] Health check result:', isHealthy ? 'OK' : 'FAILED');
    } catch (error) {
      console.error('[App] Health check error:', error);
    }
  }
}
