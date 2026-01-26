export const environment = {
  production: false,
  api: {
    baseUrl: 'https://motivational-nickel-rabbit.148-230-126-127.cpanel.site/test/api/public/api/v1',
    timeout: 30000,
    retryAttempts: 3
  },
  auth: {
    tokenKey: 'targetdesk_token',
    refreshTokenKey: 'targetdesk_refresh_token',
    tokenExpiry: 3600,
    userKey: 'targetdesk_user'
  },
  cache: {
    defaultTtl: 300000,
    maxSize: 100
  },
  logging: {
    level: 'warn' as const,
    enableConsole: true,
    enableRemote: true
  }
};