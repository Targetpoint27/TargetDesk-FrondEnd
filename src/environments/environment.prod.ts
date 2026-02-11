export const environment = {
  production: true,
  version: '2.1.1', // Incrémenter à chaque déploiement
  buildTimestamp: 1770795749,
  apiUrl: 'https://targetdesk.fr/api/public/api/v1',
  apiBaseUrl: 'https://targetdesk.fr/api/public/api/v1',
  api: {
    baseUrl: 'https://targetdesk.fr/api/public/api/v1',
    timeout: 30000,
    retryAttempts: 2
  },
  auth: {
    tokenKey: 'targetdesk_token',
    refreshTokenKey: 'targetdesk_refresh_token',
    tokenExpiry: 3600,
    userKey: 'targetdesk_user'
  },
  cache: {
    defaultTtl: 600000, // 10 minutes
    maxSize: 200
  },
  logging: {
    level: 'error' as const,
    enableConsole: false,
    enableRemote: true
  },
  chunks: {
    enableAutoReload: true, // Auto-reload si chunks non trouvés
    maxRetries: 2,
    retryDelay: 1000
  }
};