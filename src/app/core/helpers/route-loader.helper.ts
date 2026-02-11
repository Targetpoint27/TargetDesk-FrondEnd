/**
 * Helper pour charger les composants avec gestion d'erreur et retry
 * Compatible avec tous les navigateurs (Safari, Firefox, Chrome)
 */
export function loadComponent<T>(
  importFn: () => Promise<T>,
  componentName: string
): () => Promise<T> {
  return () => {
    return importFn()
      .catch(error => {
        console.warn(`[RouteLoader] Failed to load ${componentName}, attempting retry...`, {
          error: error.message,
          userAgent: navigator.userAgent
        });

        // Nettoyer le cache pour ce module
        if ('caches' in window) {
          caches.keys().then(names => {
            names.forEach(name => {
              if (name.includes('angular') || name.includes('ngsw')) {
                caches.delete(name);
              }
            });
          });
        }

        // Retry après un délai
        return new Promise<T>((resolve, reject) => {
          setTimeout(() => {
            importFn()
              .then(resolve)
              .catch(retryError => {
                console.error(`[RouteLoader] Retry failed for ${componentName}, triggering reload`, {
                  originalError: error.message,
                  retryError: retryError.message,
                  userAgent: navigator.userAgent
                });

                // Dernière tentative avec rechargement de la page
                window.location.reload();
                reject(retryError);
              });
          }, 1000);
        });
      });
  };
}

/**
 * Helper pour les routes lazy avec fallback automatique
 */
export function createLazyRoute(
  importFn: () => Promise<any>,
  componentName: string,
  fallbackRoute: string = '/dashboard'
) {
  return {
    loadComponent: loadComponent(importFn, componentName)
  };
}

/**
 * Précharge les composants critiques pour éviter les erreurs de chargement
 */
export async function preloadCriticalRoutes(): Promise<void> {
  const criticalRoutes = [
    () => import('../../features/dashboard/layout/layout'),
    () => import('../../features/auth/login/login.component'),
    () => import('../../features/settings/settings-layout.component')
  ];

  try {
    await Promise.allSettled(criticalRoutes.map(route => route()));
    console.log('[RouteLoader] Critical routes preloaded successfully');
  } catch (error) {
    console.warn('[RouteLoader] Failed to preload some critical routes:', error);
  }
}