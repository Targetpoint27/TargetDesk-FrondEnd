export const environment = {
  production: false,
  api: {
    baseUrl: 'http://localhost:8000/api/v1',
    timeout: 30000,
    retryAttempts: 3
  },
  auth: {
    tokenKey: 'targetdesk_token',
    refreshTokenKey: 'targetdesk_refresh_token',
    tokenExpiry: 3600, // 1 hour
    userKey: 'targetdesk_user'
  },
  cache: {
    defaultTtl: 300000, // 5 minutes
    maxSize: 100
  },
  logging: {
    level: 'debug' as const,
    enableConsole: true,
    enableRemote: false
  }
};