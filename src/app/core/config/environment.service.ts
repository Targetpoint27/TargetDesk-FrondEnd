import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AppConfig, ApiConfig, AuthConfig, CacheConfig, LoggingConfig } from './app.config';

@Injectable({
  providedIn: 'root'
})
export class EnvironmentService {
  private readonly config: AppConfig = environment as AppConfig;

  get isProduction(): boolean {
    return this.config.production;
  }

  get api(): ApiConfig {
    return this.config.api;
  }

  get auth(): AuthConfig {
    return this.config.auth;
  }

  get cache(): CacheConfig {
    return this.config.cache;
  }

  get logging(): LoggingConfig {
    return this.config.logging;
  }

  getApiUrl(endpoint: string): string {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
    const baseUrl = this.api.baseUrl.endsWith('/')
      ? this.api.baseUrl.slice(0, -1)
      : this.api.baseUrl;

    return `${baseUrl}/${cleanEndpoint}`;
  }

  shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.logging.level);
    const requestedLevelIndex = levels.indexOf(level);

    return requestedLevelIndex >= currentLevelIndex;
  }
}