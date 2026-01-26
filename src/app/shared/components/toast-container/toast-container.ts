import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageService, Message } from '../../services/message.service';
import { Toast, ToastData } from '../toast/toast';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule, Toast],
  template: `
    <div class="toast-container">
      <ui-toast
        *ngFor="let message of messages$ | async; trackBy: trackByMessage"
        [data]="mapToToastData(message)"
        (dismiss)="onDismiss(message.id)"
        [position]="'top-right'">
      </ui-toast>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 1rem;
      right: 1rem;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      pointer-events: none;
    }

    .toast-container ui-toast {
      pointer-events: auto;
      position: relative !important;
      top: auto !important;
      right: auto !important;
      transform: none !important;
      opacity: 1 !important;
      visibility: visible !important;
    }

    /* Fallback CSS variables for toast colors */
    .toast-container {
      --color-success: #10b981;
      --color-error: #ef4444;
      --color-warning: #f59e0b;
      --color-info: #3b82f6;
      --color-primary: #6366f1;
      --color-primary-dark: #4f46e5;
      --color-primary-light: #a5b4fc;
      --color-white: #ffffff;
      --color-gray-900: #111827;
      --color-gray-700: #374151;
      --color-gray-600: #4b5563;
      --color-gray-400: #9ca3af;
      --color-gray-300: #d1d5db;
      --color-gray-200: #e5e7eb;
      --color-gray-100: #f3f4f6;
      --color-gray-50: #f9fafb;
      --spacing-1: 0.25rem;
      --spacing-2: 0.5rem;
      --spacing-3: 0.75rem;
      --spacing-4: 1rem;
      --spacing-8: 2rem;
      --font-size-xs: 0.75rem;
      --font-size-sm: 0.875rem;
      --font-size-base: 1rem;
      --font-weight-medium: 500;
      --font-weight-semibold: 600;
      --font-weight-bold: 700;
      --radius-md: 0.375rem;
      --radius-lg: 0.5rem;
      --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      --transition-fast: 150ms ease;
      --transition-normal: 200ms ease;
    }
  `]
})
export class ToastContainer {
  private messageService = inject(MessageService);

  messages$: Observable<Message[]> = this.messageService.messages;



  mapToToastData(message: Message): ToastData {
    const toastData = {
      id: message.id,
      message: message.content,
      title: message.title,
      type: message.type,
      duration: message.duration || 5000,
      persistent: message.duration === undefined,
      actions: message.action ? [{
        label: message.action.label,
        action: message.action.callback,
        style: 'primary' as const
      }] : undefined
    };

    return toastData;
  }

  onDismiss(messageId: string) {
    this.messageService.dismissMessage(messageId);
  }

  trackByMessage(index: number, message: Message): string {
    return message.id;
  }
}