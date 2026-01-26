import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SimpleNotificationService {

  showError(message: string, title = 'Erreur'): void {
    this.createNotification('error', title, message);
  }

  showSuccess(message: string, title = 'Succès'): void {
    this.createNotification('success', title, message);
  }

  showInfo(message: string, title = 'Information'): void {
    this.createNotification('info', title, message);
  }

  private createNotification(type: string, title: string, message: string): void {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `simple-notification simple-notification--${type}`;
    notification.innerHTML = `
      <div class="simple-notification__content">
        <div class="simple-notification__title">${title}</div>
        <div class="simple-notification__message">${message}</div>
        <button class="simple-notification__close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;

    // Add styles if not already added
    if (!document.getElementById('simple-notification-styles')) {
      this.addStyles();
    }

    // Add to page
    document.body.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);

    // Animate in
    setTimeout(() => {
      notification.classList.add('simple-notification--visible');
    }, 10);
  }

  private addStyles(): void {
    const styles = document.createElement('style');
    styles.id = 'simple-notification-styles';
    styles.textContent = `
      .simple-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        max-width: 350px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        z-index: 10000;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
        border-left: 4px solid #ccc;
      }

      .simple-notification--visible {
        opacity: 1;
        transform: translateX(0);
      }

      .simple-notification--error {
        border-left-color: #ef4444;
      }

      .simple-notification--success {
        border-left-color: #10b981;
      }

      .simple-notification--info {
        border-left-color: #3b82f6;
      }

      .simple-notification__content {
        padding: 16px;
        position: relative;
      }

      .simple-notification__title {
        font-weight: 600;
        color: #111827;
        margin-bottom: 4px;
        font-size: 14px;
      }

      .simple-notification__message {
        color: #6b7280;
        font-size: 13px;
        line-height: 1.4;
      }

      .simple-notification__close {
        position: absolute;
        top: 8px;
        right: 8px;
        background: none;
        border: none;
        font-size: 18px;
        color: #9ca3af;
        cursor: pointer;
        padding: 4px;
      }

      .simple-notification__close:hover {
        color: #374151;
      }
    `;
    document.head.appendChild(styles);
  }
}