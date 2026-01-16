import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { retryWhen, scan, delay, catchError, timeout, finalize } from 'rxjs/operators';
import { EnvironmentService } from '../config/environment.service';
import { ErrorService } from '../error/error.service';
import { LoggingService } from '../logging/logging.service';

export interface RequestOptions {
  headers?: HttpHeaders | { [header: string]: string | string[] };
  params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> };
  observe?: 'body';
  responseType?: 'json' | 'blob' | 'text' | 'arraybuffer';
  withCredentials?: boolean;
  timeout?: number;
  retryAttempts?: number;
  skipErrorHandling?: boolean;
  context?: any;
}

export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
  errors?: any;
  meta?: {
    pagination?: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
    [key: string]: any;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly defaultHeaders: HttpHeaders;
  private requestCount = 0;

  constructor(
    private http: HttpClient,
    private environmentService: EnvironmentService,
    private errorService: ErrorService,
    private loggingService: LoggingService
  ) {
    this.defaultHeaders = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
  }

  get<T>(endpoint: string, options?: RequestOptions): Observable<T> {
    return this.makeRequest<T>('GET', endpoint, undefined, options);
  }

  post<T>(endpoint: string, data?: any, options?: RequestOptions): Observable<T> {
    return this.makeRequest<T>('POST', endpoint, data, options);
  }

  put<T>(endpoint: string, data?: any, options?: RequestOptions): Observable<T> {
    return this.makeRequest<T>('PUT', endpoint, data, options);
  }

  patch<T>(endpoint: string, data?: any, options?: RequestOptions): Observable<T> {
    return this.makeRequest<T>('PATCH', endpoint, data, options);
  }

  delete<T>(endpoint: string, options?: RequestOptions): Observable<T> {
    return this.makeRequest<T>('DELETE', endpoint, undefined, options);
  }

  private makeRequest<T>(
    method: string,
    endpoint: string,
    data?: any,
    options?: RequestOptions
  ): Observable<T> {
    const requestId = this.generateRequestId();
    const url = this.environmentService.getApiUrl(endpoint);
    const headers = this.buildHeaders(options?.headers);
    const requestTimeout = options?.timeout || this.environmentService.api.timeout;
    const retryAttempts = options?.retryAttempts ?? this.environmentService.api.retryAttempts;

    // Log request
    this.loggingService.debug(`API ${method} Request`, {
      component: 'ApiService',
      action: `${method} ${endpoint}`,
      data: {
        requestId,
        url,
        method,
        endpoint,
        payload: data,
        options
      }
    });

    const baseHttpOptions = {
      headers,
      params: options?.params,
      withCredentials: options?.withCredentials || false
    };

    // Add responseType only if it's not 'json' (default)
    const httpOptions: any = options?.responseType && options.responseType !== 'json'
      ? { ...baseHttpOptions, responseType: options.responseType }
      : baseHttpOptions;

    let request$: Observable<any>;

    switch (method.toLowerCase()) {
      case 'get':
        request$ = this.http.get(url, httpOptions);
        break;
      case 'post':
        request$ = this.http.post(url, data, httpOptions);
        break;
      case 'put':
        request$ = this.http.put(url, data, httpOptions);
        break;
      case 'patch':
        request$ = this.http.patch(url, data, httpOptions);
        break;
      case 'delete':
        request$ = this.http.delete(url, httpOptions);
        break;
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }

    return request$.pipe(
      timeout(requestTimeout),
      retryWhen(errors =>
        errors.pipe(
          scan((retryCount, error) => {
            // Only retry on network errors (status 0) or server errors (5xx)
            if (error.status === 0 || (error.status >= 500 && error.status < 600)) {
              if (retryCount < retryAttempts) {
                return retryCount + 1;
              }
            }
            // Don't retry on client errors (4xx) including 401 auth errors
            throw error;
          }, 0),
          delay(1000) // Wait 1s between retries
        )
      ),
      catchError((error: HttpErrorResponse) => {
        if (options?.skipErrorHandling) {
          return throwError(() => error);
        }

        const context = {
          component: 'ApiService',
          action: `${method} ${endpoint}`,
          requestId,
          additionalData: {
            url,
            method,
            payload: data,
            options
          }
        };

        return this.errorService.handleApiError(error, context);
      }),
      finalize(() => {
        this.loggingService.debug(`API ${method} Request completed`, {
          component: 'ApiService',
          action: `${method} ${endpoint}`,
          data: { requestId, url, method }
        });
      })
    ).pipe(
      catchError(error => {
        this.loggingService.error(`API ${method} Request failed`, {
          component: 'ApiService',
          action: `${method} ${endpoint}`,
          data: {
            requestId,
            url,
            method,
            error: error.message || error
          }
        });
        return throwError(() => error);
      })
    );
  }

  private buildHeaders(customHeaders?: HttpHeaders | { [header: string]: string | string[] }): HttpHeaders {
    let headers = this.defaultHeaders;

    if (customHeaders) {
      if (customHeaders instanceof HttpHeaders) {
        headers = customHeaders;
      } else {
        Object.keys(customHeaders).forEach(key => {
          headers = headers.set(key, customHeaders[key] as string | string[]);
        });
      }
    }

    // Add authorization header if token exists
    const token = this.getStoredToken();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    // Add request ID for tracking
    const requestId = this.generateRequestId();
    headers = headers.set('X-Request-ID', requestId);

    return headers;
  }

  private getStoredToken(): string | null {
    const tokenKey = this.environmentService.auth.tokenKey;
    return localStorage.getItem(tokenKey);
  }

  private generateRequestId(): string {
    this.requestCount++;
    return `req_${Date.now()}_${this.requestCount}`;
  }

  // Utility methods for common response patterns
  unwrapApiResponse<T>(response: any): T {
    // Handle different API response formats
    if (response && typeof response === 'object') {
      // Standard API wrapper format
      if (response.body && response.body.data !== undefined) {
        return response.body.data;
      }

      // Direct response body
      if (response.body) {
        return response.body;
      }

      // Direct data
      if (response.data !== undefined) {
        return response.data;
      }
    }

    return response;
  }

  // Health check endpoint
  healthCheck(): Observable<any> {
    return this.get('/health', {
      skipErrorHandling: true,
      timeout: 5000,
      retryAttempts: 1
    });
  }

  // Get API base URL
  getBaseUrl(): string {
    return this.environmentService.api.baseUrl;
  }

  // Get full URL for endpoint
  getFullUrl(endpoint: string): string {
    return this.environmentService.getApiUrl(endpoint);
  }
}