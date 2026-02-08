import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InactiveClient } from '../../interfaces/dashboard.interface';

@Component({
  selector: 'app-inactive-clients-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-2">
      <div *ngFor="let client of clients; trackBy: trackClient"
           class="group flex items-center justify-between p-3 rounded-lg border border-amber-100/50 hover:border-amber-200/60 hover:bg-amber-50/30 transition-all duration-200">

        <div class="flex items-center space-x-3">
          <!-- Warning indicator -->
          <div class="flex-shrink-0">
            <div class="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center">
              <span class="text-white font-bold text-xs">{{ client.days_since_last_interaction }}j</span>
            </div>
          </div>

          <!-- Client info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center space-x-3">
              <h4 class="font-medium text-slate-800 text-sm">{{ client.name }}</h4>
              <span class="px-2 py-0.5 rounded-full text-xs font-medium"
                    [class]="getStatusClass(client.status)">
                {{ formatStatus(client.status) }}
              </span>
            </div>

            <p class="text-slate-600 text-sm mt-1 flex items-center">
              <i class="bi bi-envelope text-slate-400 mr-1.5 text-xs"></i>
              {{ client.email }}
            </p>

            <div class="flex items-center space-x-3 mt-1 text-xs text-slate-500">
              <span class="flex items-center">
                <i class="bi bi-calendar-x mr-1"></i>
                Dernière interaction: {{ formatDate(client.last_interaction_date) }}
              </span>
              <span class="flex items-center font-medium"
                    [class.text-amber-600]="client.days_since_last_interaction >= 30"
                    [class.text-red-600]="client.days_since_last_interaction >= 60">
                <i class="bi bi-clock mr-1"></i>
                {{ getInactivityMessage(client.days_since_last_interaction) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center space-x-2">
          <div class="opacity-0 group-hover:opacity-100 flex space-x-1 transition-opacity duration-200">
            <button
              (click)="onContact(client)"
              class="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-lg transition-colors">
              <i class="bi bi-telephone mr-1"></i>
              Contacter
            </button>
            <button
              (click)="onSchedule(client)"
              class="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs rounded-lg transition-colors">
              <i class="bi bi-calendar-plus mr-1"></i>
              RDV
            </button>
          </div>

          <div class="flex-shrink-0 ml-3">
            <div class="w-2 h-2 rounded-full"
                 [class.bg-amber-400]="client.days_since_last_interaction < 45"
                 [class.bg-red-400]="client.days_since_last_interaction >= 45"
                 [class.animate-pulse]="client.days_since_last_interaction >= 60">
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class InactiveClientsListComponent {
  @Input() clients: InactiveClient[] = [];
  @Output() contact = new EventEmitter<InactiveClient>();
  @Output() schedule = new EventEmitter<InactiveClient>();

  trackClient(index: number, client: InactiveClient): number {
    return client.id;
  }

  getStatusClass(status: string): string {
    if (!status) return 'bg-gray-100 text-gray-700';

    const classes: Record<string, string> = {
      'active': 'bg-green-100 text-green-700',
      'inactive': 'bg-red-100 text-red-700',
      'prospect': 'bg-amber-100 text-amber-700',
      'archived': 'bg-gray-100 text-gray-700'
    };
    return classes[status.toLowerCase()] || 'bg-gray-100 text-gray-700';
  }

  formatStatus(status: string): string {
    if (!status) return 'Inconnu';

    const statuses: Record<string, string> = {
      'active': 'Actif',
      'inactive': 'Inactif',
      'prospect': 'Prospect',
      'archived': 'Archivé'
    };
    return statuses[status.toLowerCase()] || status;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  getInactivityMessage(days: number): string {
    if (days < 30) return `${days} jours d'inactivité`;
    if (days < 60) return `${days} jours sans contact`;
    return `${days} jours - URGENT`;
  }

  onContact(client: InactiveClient): void {
    this.contact.emit(client);
  }

  onSchedule(client: InactiveClient): void {
    this.schedule.emit(client);
  }
}