import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { LoggingService } from '../logging/logging.service';

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public userMessage: string,
    public details?: any,
    public context?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export interface ValidationErrors {
  [field: string]: string[];
}

export interface FormErrors {
  [field: string]: string;
}

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  additionalData?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ErrorService {
  constructor(private loggingService: LoggingService) {}

  handleApiError(error: HttpErrorResponse, context?: ErrorContext): Observable<never> {
    const appError = this.mapHttpErrorToAppError(error);

    this.loggingService.error('API Error occurred', {
      ...context,
      component: context?.component || 'Unknown',
      action: context?.action || 'Unknown',
      data: {
        status: error.status,
        statusText: error.statusText,
        message: appError.message,
        url: error.url,
        error: appError
      }
    });

    return throwError(() => appError);
  }

  handleValidationError(errors: ValidationErrors): FormErrors {
    const formErrors: FormErrors = {};

    Object.keys(errors).forEach(field => {
      // Take the first error message for each field
      formErrors[field] = errors[field][0] || 'Erreur de validation';
    });

    this.loggingService.warn('Validation errors occurred', {
      component: 'Form',
      data: { validationErrors: errors, formErrors }
    });

    return formErrors;
  }

  showUserError(error: AppError, context?: ErrorContext): void {
    this.loggingService.error('User error displayed', {
      ...context,
      data: { error }
    });

    // TODO: Integrate with notification service or toast system
    console.error('User Error:', error.userMessage);
  }

  reportError(error: Error, context?: ErrorContext): void {
    const appError = new AppError(
      'UNEXPECTED_ERROR',
      error.message,
      'Une erreur inattendue s\'est produite',
      {
        stack: error.stack,
        name: error.name
      },
      context
    );

    this.loggingService.error('Unexpected error reported', {
      ...context,
      data: {
        originalError: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        appError
      }
    });

    // TODO: Send to remote error reporting service (Sentry, etc.)
  }

  private mapHttpErrorToAppError(httpError: HttpErrorResponse): AppError {
    let appError: AppError;

    switch (httpError.status) {
      case 0:
        appError = new AppError(
          'NETWORK_ERROR',
          'Network connection failed',
          'Impossible de se connecter au serveur. Vérifiez votre connexion internet.'
        );
        break;

      case 400:
        appError = new AppError(
          'BAD_REQUEST',
          httpError.error?.message || 'Bad request',
          httpError.error?.message || 'Requête invalide',
          httpError.error
        );
        break;

      case 401:
        // Use API error message if available, fallback to generic session expired message
        const apiMessage = httpError.error?.message || httpError.error?.error;
        appError = new AppError(
          'UNAUTHORIZED',
          apiMessage || 'Unauthorized',
          apiMessage || 'Session expirée. Veuillez vous reconnecter.',
          httpError.error
        );
        break;

      case 403:
        appError = new AppError(
          'FORBIDDEN',
          httpError.error?.message || 'Forbidden',
          'Vous n\'avez pas les permissions nécessaires.',
          httpError.error
        );
        break;

      case 404:
        appError = new AppError(
          'NOT_FOUND',
          httpError.error?.message || 'Resource not found',
          'Ressource introuvable.',
          httpError.error
        );
        break;

      case 422:
        appError = new AppError(
          'VALIDATION_ERROR',
          'Validation failed',
          'Données invalides',
          httpError.error
        );
        break;

      case 429:
        appError = new AppError(
          'RATE_LIMIT',
          'Too many requests',
          'Trop de requêtes. Veuillez patienter quelques instants.',
          httpError.error
        );
        break;

      case 500:
        appError = new AppError(
          'SERVER_ERROR',
          httpError.error?.message || 'Internal server error',
          'Erreur du serveur. Veuillez réessayer plus tard.',
          httpError.error
        );
        break;

      case 502:
      case 503:
      case 504:
        appError = new AppError(
          'SERVICE_UNAVAILABLE',
          'Service temporarily unavailable',
          'Service temporairement indisponible. Veuillez réessayer plus tard.',
          httpError.error
        );
        break;

      default:
        appError = new AppError(
          'UNKNOWN_ERROR',
          httpError.error?.message || `HTTP Error ${httpError.status}`,
          'Une erreur inattendue s\'est produite. Veuillez réessayer.',
          httpError.error
        );
    }

    // Add context to the existing AppError
    appError.context = {
      httpStatus: httpError.status,
      httpStatusText: httpError.statusText,
      url: httpError.url,
      timestamp: new Date()
    };

    return appError;
  }

  isNetworkError(error: AppError): boolean {
    return error.code === 'NETWORK_ERROR';
  }

  isAuthenticationError(error: AppError): boolean {
    return error.code === 'UNAUTHORIZED';
  }

  isValidationError(error: AppError): boolean {
    return error.code === 'VALIDATION_ERROR';
  }

  isServerError(error: AppError): boolean {
    return ['SERVER_ERROR', 'SERVICE_UNAVAILABLE'].includes(error.code);
  }
}