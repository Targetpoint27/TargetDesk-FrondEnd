import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter, take, map } from 'rxjs/operators';
import { AppError, ValidationErrors } from '../../core/error/error.service';

export type MessageType = 'success' | 'error' | 'warning' | 'info';

export interface Message {
  id: string;
  type: MessageType;
  title?: string;
  content: string;
  duration?: number; // milliseconds, undefined for persistent
  action?: {
    label: string;
    callback: () => void;
  };
  timestamp: Date;
  dismissible?: boolean;
}

export interface FormFieldErrors {
  [fieldName: string]: string;
}

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  private messages$ = new BehaviorSubject<Message[]>([]);
  private messageId = 0;

  // Public observables
  public readonly messages: Observable<Message[]> = this.messages$.asObservable();

  constructor() {}

  // Success messages
  showSuccess(content: string, options?: {
    title?: string;
    duration?: number;
    action?: Message['action'];
  }): string {
    return this.addMessage({
      type: 'success',
      title: options?.title,
      content,
      duration: options?.duration ?? 5000,
      action: options?.action,
      dismissible: true
    });
  }

  // Error messages
  showError(content: string, options?: {
    title?: string;
    duration?: number;
    action?: Message['action'];
  }): string {
    return this.addMessage({
      type: 'error',
      title: options?.title || 'Erreur',
      content,
      duration: options?.duration ?? 8000,
      action: options?.action,
      dismissible: true
    });
  }

  // Warning messages
  showWarning(content: string, options?: {
    title?: string;
    duration?: number;
    action?: Message['action'];
  }): string {
    return this.addMessage({
      type: 'warning',
      title: options?.title || 'Attention',
      content,
      duration: options?.duration ?? 6000,
      action: options?.action,
      dismissible: true
    });
  }

  // Info messages
  showInfo(content: string, options?: {
    title?: string;
    duration?: number;
    action?: Message['action'];
  }): string {
    return this.addMessage({
      type: 'info',
      title: options?.title,
      content,
      duration: options?.duration ?? 5000,
      action: options?.action,
      dismissible: true
    });
  }

  // Handle application errors
  showAppError(error: AppError, options?: {
    showTechnicalDetails?: boolean;
    action?: Message['action'];
  }): string {
    let content = error.userMessage;

    if (options?.showTechnicalDetails && error.message !== error.userMessage) {
      content += `\n\nDétails techniques: ${error.message}`;
    }

    return this.showError(content, {
      title: 'Erreur',
      duration: 10000,
      action: options?.action
    });
  }

  // Handle validation errors for forms
  showValidationErrors(errors: ValidationErrors): FormFieldErrors {
    const fieldErrors: FormFieldErrors = {};

    // Convert validation errors to field errors
    Object.keys(errors).forEach(field => {
      if (errors[field] && errors[field].length > 0) {
        fieldErrors[field] = errors[field][0];
      }
    });

    // Also show a general error message
    const errorCount = Object.keys(fieldErrors).length;
    if (errorCount > 0) {
      this.showError(
        `${errorCount} erreur${errorCount > 1 ? 's' : ''} de validation détectée${errorCount > 1 ? 's' : ''}. Veuillez corriger les champs marqués.`,
        {
          title: 'Erreurs de validation',
          duration: 8000
        }
      );
    }

    return fieldErrors;
  }

  // Extract validation errors without showing general toast (for inline field errors)
  extractValidationErrors(errors: ValidationErrors): FormFieldErrors {
    const fieldErrors: FormFieldErrors = {};

    // Convert validation errors to field errors
    Object.keys(errors).forEach(field => {
      if (errors[field] && errors[field].length > 0) {
        fieldErrors[field] = errors[field][0];
      }
    });

    return fieldErrors;
  }

  // Authentication specific messages
  showLoginSuccess(userName: string): string {
    return this.showSuccess(
      `Bienvenue ${userName} ! Vous êtes maintenant connecté.`,
      {
        title: 'Connexion réussie',
        duration: 4000
      }
    );
  }

  showRegistrationSuccess(userName: string): string {
    return this.showSuccess(
      `Bienvenue ${userName} ! Votre compte a été créé avec succès.`,
      {
        title: 'Inscription réussie',
        duration: 5000
      }
    );
  }

  showLogoutSuccess(): string {
    return this.showInfo(
      'Vous avez été déconnecté avec succès.',
      {
        title: 'Déconnexion',
        duration: 3000
      }
    );
  }

  showSessionExpired(): string {
    return this.showWarning(
      'Votre session a expiré. Veuillez vous reconnecter.',
      {
        title: 'Session expirée',
        duration: undefined,
        action: {
          label: 'Se reconnecter',
          callback: () => {
            // TODO: Redirect to login or trigger login modal
            console.log('Redirect to login');
          }
        }
      }
    );
  }

  // Message management
  dismissMessage(messageId: string): void {
    const currentMessages = this.messages$.value;
    const filteredMessages = currentMessages.filter(msg => msg.id !== messageId);
    this.messages$.next(filteredMessages);
  }

  dismissAll(): void {
    this.messages$.next([]);
  }

  // Get specific message
  getMessage(messageId: string): Message | undefined {
    return this.messages$.value.find(msg => msg.id === messageId);
  }

  // Get messages by type
  getMessagesByType(type: MessageType): Observable<Message[]> {
    return this.messages.pipe(
      map(messages => messages.filter(msg => msg.type === type)),
      filter(messages => messages.length > 0),
      take(1)
    );
  }

  private addMessage(messageData: Omit<Message, 'id' | 'timestamp'>): string {
    const message: Message = {
      ...messageData,
      id: this.generateMessageId(),
      timestamp: new Date(),
      dismissible: messageData.dismissible ?? true
    };

    const currentMessages = this.messages$.value;
    this.messages$.next([...currentMessages, message]);

    // Auto-dismiss if duration is specified
    if (message.duration && message.duration > 0) {
      setTimeout(() => {
        this.dismissMessage(message.id);
      }, message.duration);
    }

    return message.id;
  }

  private generateMessageId(): string {
    return `msg_${++this.messageId}_${Date.now()}`;
  }

  // Utility method to check if there are any active messages
  hasMessages(): Observable<boolean> {
    return this.messages.pipe(
      map(messages => messages.length > 0)
    );
  }

  // Get message count by type
  getMessageCount(type?: MessageType): number {
    const messages = this.messages$.value;
    return type
      ? messages.filter(msg => msg.type === type).length
      : messages.length;
  }
}