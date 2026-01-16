export const environment = {
  production: true,
  api: {
    baseUrl: 'https://api.targetdesk.com/api/v1',
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
  }
};