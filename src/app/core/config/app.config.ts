export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
}

export interface AuthConfig {
  tokenKey: string;
  refreshTokenKey: string;
  tokenExpiry: number;
  userKey: string;
}

export interface CacheConfig {
  defaultTtl: number;
  maxSize: number;
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  enableConsole: boolean;
  enableRemote: boolean;
}

export interface AppConfig {
  production: boolean;
  api: ApiConfig;
  auth: AuthConfig;
  cache: CacheConfig;
  logging: LoggingConfig;
}