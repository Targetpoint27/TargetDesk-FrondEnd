import { Injectable } from '@angular/core';
import { Router, NavigationError } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class ChunkErrorHandlerService {
  private retryAttempts = new Map<string, number>();
  private maxRetries = 2;
  private retryDelay = 1000;
  private isHandlingError = false;

  constructor(private router: Router) {
    this.setupGlobalChunkErrorHandler();
    this.setupRouterErrorHandler();
  }

  private setupGlobalChunkErrorHandler(): void {
    // Gestion des erreurs de script/module
    window.addEventListener('error', (event) => {
      const error = event.error;
      const message = event.message || '';

      if (this.isChunkError(error, message, event)) {
        console.warn('[ChunkErrorHandler] Chunk loading failed, attempting recovery...', {
          error,
          message,
          filename: event.filename,
          userAgent: navigator.userAgent
        });
        this.handleChunkError(event.filename || 'unknown');
      }
    }, true); // Utiliser capture phase pour Safari

    // Gestion des promesses rejetées (dynamic imports)
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason;
      if (this.isDynamicImportError(error)) {
        console.warn('[ChunkErrorHandler] Dynamic import failed, attempting recovery...', {
          error,
          userAgent: navigator.userAgent
        });
        event.preventDefault(); // Empêcher l'affichage de l'erreur dans la console
        this.handleChunkError(error.message || 'dynamic-import');
      }
    }, true); // Utiliser capture phase pour Safari
  }

  private setupRouterErrorHandler(): void {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationError) {
        const error = event.error;
        if (this.isRouterChunkError(error)) {
          console.warn('[ChunkErrorHandler] Router navigation failed due to chunk error', {
            url: event.url,
            error,
            userAgent: navigator.userAgent
          });
          this.handleRouterChunkError(event.url);
        }
      }
    });
  }

  private isChunkError(error: any, message: string, event: ErrorEvent): boolean {
    // Vérifications multiples pour identifier les erreurs de chunks
    const chunkErrorIndicators = [
      'Loading chunk',
      'Loading CSS chunk',
      'chunk-',
      'Failed to fetch dynamically imported module',
      'ChunkLoadError',
      'Loading failed for the <script> element',
      'Échec du chargement pour le module dont la source est',
      'Loading module from'
    ];

    // Vérifier le message d'erreur
    const hasChunkErrorMessage = chunkErrorIndicators.some(indicator =>
      message.toLowerCase().includes(indicator.toLowerCase()) ||
      error?.message?.toLowerCase().includes(indicator.toLowerCase())
    );

    // Vérifier le nom du fichier
    const hasChunkFilename = event.filename && (
      event.filename.includes('chunk-') ||
      /chunk-[A-Z0-9]{8}\.js/.test(event.filename)
    );

    // Vérifier le stack trace pour Safari
    const hasChunkStack = error?.stack && (
      error.stack.includes('chunk-') ||
      error.stack.includes('Loading module')
    );

    return hasChunkErrorMessage || hasChunkFilename || hasChunkStack;
  }

  private isDynamicImportError(error: any): boolean {
    if (!error) return false;

    const errorMessage = error.message || error.toString();
    const dynamicImportErrors = [
      'Failed to fetch dynamically imported module',
      'Loading chunk',
      'ChunkLoadError',
      'Loading failed for the <script> element',
      'Échec du chargement pour le module dont la source est',
      'error loading dynamically imported module'
    ];

    return dynamicImportErrors.some(indicator =>
      errorMessage.toLowerCase().includes(indicator.toLowerCase())
    );
  }

  private isRouterChunkError(error: any): boolean {
    if (!error) return false;

    const errorMessage = error.message || error.toString();
    return this.isDynamicImportError(error) ||
           errorMessage.includes('chunk-') ||
           errorMessage.includes('Loading module');
  }

  private handleChunkError(source: string = 'unknown'): void {
    if (this.isHandlingError) {
      return;
    }

    this.isHandlingError = true;

    // Essayer de retry avant reload complet
    const retryKey = this.getCurrentUrl();
    const attempts = this.retryAttempts.get(retryKey) || 0;

    if (attempts < this.maxRetries) {
      this.retryAttempts.set(retryKey, attempts + 1);
      console.log(`[ChunkErrorHandler] Retrying navigation, attempt ${attempts + 1}/${this.maxRetries}`);

      this.clearCaches().then(() => {
        setTimeout(() => {
          this.retryNavigation();
          this.isHandlingError = false;
        }, this.retryDelay * (attempts + 1));
      });
    } else {
      console.log('[ChunkErrorHandler] Max retries exceeded, performing full reload');
      this.performFullReload();
    }
  }

  private handleRouterChunkError(url: string): void {
    console.log('[ChunkErrorHandler] Router chunk error, attempting navigation retry');

    this.clearCaches().then(() => {
      setTimeout(() => {
        // Essayer de naviguer vers la route qui a échoué
        this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
          this.router.navigate([url]);
        });
      }, 500);
    });
  }

  private async clearCaches(): Promise<void> {
    // Nettoyer le cache si possible
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(name => {
            if (name.includes('angular') || name.includes('ngsw') || name.includes('targetdesk')) {
              return caches.delete(name);
            }
            return Promise.resolve();
          })
        );
        console.log('[ChunkErrorHandler] Caches cleared successfully');
      } catch (error) {
        console.warn('[ChunkErrorHandler] Failed to clear caches:', error);
      }
    }
  }

  private retryNavigation(): void {
    // Tenter de re-naviguer vers la route actuelle
    const currentUrl = this.router.url;
    console.log('[ChunkErrorHandler] Retrying navigation to:', currentUrl);

    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigateByUrl(currentUrl);
    }).catch(() => {
      // Si la retry échoue, faire un reload
      this.performFullReload();
    });
  }

  private performFullReload(): void {
    // Éviter les reloads multiples
    if (this.isReloadInProgress()) {
      return;
    }

    this.setReloadInProgress();

    // Nettoyer complètement avant reload
    this.clearCaches().then(() => {
      // Force clear du localStorage des routes si nécessaire
      try {
        Object.keys(localStorage).forEach(key => {
          if (key.includes('route') || key.includes('nav')) {
            localStorage.removeItem(key);
          }
        });
      } catch (e) {
        console.warn('[ChunkErrorHandler] Failed to clear localStorage:', e);
      }

      // Attendre un peu pour éviter les reloads trop rapides
      setTimeout(() => {
        console.log('[ChunkErrorHandler] Performing full page reload');
        window.location.reload(); // Force reload from server
      }, 1000);
    });
  }

  private getCurrentUrl(): string {
    return window.location.pathname + window.location.search;
  }

  private isReloadInProgress(): boolean {
    return sessionStorage.getItem('chunk-reload-in-progress') === 'true';
  }

  private setReloadInProgress(): void {
    sessionStorage.setItem('chunk-reload-in-progress', 'true');

    // Nettoyer le flag après 15 secondes
    setTimeout(() => {
      sessionStorage.removeItem('chunk-reload-in-progress');
    }, 15000);
  }

  /**
   * Méthode publique pour forcer une retry
   */
  public forceRetry(): void {
    this.retryAttempts.clear();
    this.isHandlingError = false;
    console.log('[ChunkErrorHandler] Forced retry triggered');
    this.retryNavigation();
  }

  /**
   * Méthode publique pour vérifier l'état de santé
   */
  public checkHealth(): Promise<boolean> {
    return new Promise((resolve) => {
      // Test simple pour vérifier si l'app fonctionne
      try {
        const testDiv = document.createElement('div');
        document.body.appendChild(testDiv);
        document.body.removeChild(testDiv);
        resolve(true);
      } catch (error) {
        console.error('[ChunkErrorHandler] Health check failed:', error);
        resolve(false);
      }
    });
  }
}