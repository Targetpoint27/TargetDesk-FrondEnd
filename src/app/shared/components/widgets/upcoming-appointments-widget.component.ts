import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UpcomingAppointmentsData, UpcomingAppointment } from '../../interfaces/dashboard.interface';

@Component({
  selector: 'app-upcoming-appointments-widget',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <!-- Header -->
      <div class="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-200 p-6">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-slate-800 flex items-center">
              <i class="bi bi-calendar-week text-indigo-600 mr-2"></i>
              Rendez-vous à venir
            </h3>
            <p class="text-sm text-slate-600 mt-1">Vos prochains {{ data?.days_ahead || 7 }} jours</p>
          </div>
          <div class="text-right">
            <div class="text-2xl font-bold text-indigo-600">{{ data?.total_found || 0 }}</div>
            <div class="text-xs text-slate-500">RDV planifiés</div>
          </div>
        </div>
      </div>

      <div class="p-6">
        <!-- Loading State -->
        <div *ngIf="loading" class="flex items-center justify-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span class="ml-3 text-slate-600">Chargement des rendez-vous...</span>
        </div>

        <!-- Error State -->
        <div *ngIf="error" class="text-center py-8">
          <i class="bi bi-exclamation-triangle text-4xl text-red-400 mb-2"></i>
          <p class="text-slate-600">{{ error }}</p>
        </div>

        <!-- Content -->
        <div *ngIf="!loading && !error">
          <div *ngIf="data?.appointments?.length; else noAppointments" class="space-y-4">

            <!-- Groupement par jour -->
            <div *ngFor="let group of getAppointmentsByDay(); trackBy: trackGroup" class="space-y-3">
              <!-- En-tête du jour -->
              <div class="flex items-center space-x-3 py-2 border-b border-gray-100">
                <div class="flex-shrink-0">
                  <div [class]="getDayHeaderClass(group.date)" class="w-12 h-12 rounded-lg flex flex-col items-center justify-center text-white">
                    <div class="text-xs font-medium">{{ formatDayName(group.date) }}</div>
                    <div class="text-lg font-bold">{{ formatDayNumber(group.date) }}</div>
                  </div>
                </div>
                <div class="flex-1">
                  <h4 class="font-medium text-slate-800">{{ formatFullDate(group.date) }}</h4>
                  <p class="text-sm text-slate-500">{{ group.appointments.length }} rendez-vous</p>
                </div>
              </div>

              <!-- Liste des RDV du jour -->
              <div class="pl-4 space-y-3">
                <div
                  *ngFor="let appointment of group.appointments; trackBy: trackAppointment"
                  class="flex items-start p-4 bg-indigo-50/30 border border-indigo-100/50 rounded-lg hover:bg-indigo-50 transition-all duration-200 hover:shadow-sm">

                  <!-- Heure -->
                  <div class="flex-shrink-0 mr-4">
                    <div class="bg-white border border-indigo-200 rounded-lg px-3 py-2 text-center min-w-[4rem]">
                      <div class="text-sm font-bold text-indigo-600">{{ formatTime(appointment.scheduled_at) }}</div>
                    </div>
                  </div>

                  <!-- Contenu -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-start justify-between">
                      <div class="flex-1">
                        <h5 class="font-semibold text-slate-800 mb-1">{{ appointment.subject }}</h5>
                        <p class="text-slate-600 mb-2 flex items-center">
                          <i class="bi bi-person text-indigo-500 mr-1"></i>
                          {{ appointment.client_name }}
                        </p>

                        <!-- Détails supplémentaires -->
                        <div class="flex items-center space-x-4 text-xs text-slate-500">
                          <span *ngIf="appointment.location" class="flex items-center">
                            <i class="bi bi-geo-alt mr-1"></i>
                            {{ appointment.location }}
                          </span>
                          <span class="flex items-center">
                            <i class="bi bi-clock mr-1"></i>
                            {{ getDuration(appointment) }}
                          </span>
                        </div>
                      </div>

                      <!-- Badges et actions -->
                      <div class="flex flex-col items-end space-y-2 ml-4">
                        <div class="flex space-x-2">
                          <span [class]="getPriorityClass(appointment.priority)" class="px-2 py-1 rounded text-xs font-medium">
                            {{ formatPriority(appointment.priority) }}
                          </span>
                          <span [class]="getStatusClass(appointment.status)" class="px-2 py-1 rounded text-xs font-medium">
                            {{ formatStatus(appointment.status) }}
                          </span>
                        </div>

                        <!-- Actions -->
                        <div class="flex space-x-1">
                          <button
                            class="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded transition-colors"
                            title="Voir les détails">
                            <i class="bi bi-eye text-xs"></i>
                          </button>
                          <button
                            class="p-1.5 text-green-600 hover:bg-green-100 rounded transition-colors"
                            title="Confirmer">
                            <i class="bi bi-check-lg text-xs"></i>
                          </button>
                          <button
                            class="p-1.5 text-amber-600 hover:bg-amber-100 rounded transition-colors"
                            title="Reprogrammer">
                            <i class="bi bi-arrow-clockwise text-xs"></i>
                          </button>
                        </div>
                      </div>
                    </div>

                    <!-- Barre de progression jusqu'au RDV -->
                    <div *ngIf="isToday(appointment.scheduled_at)" class="mt-3">
                      <div class="flex items-center space-x-2">
                        <div class="flex-1 bg-gray-200 rounded-full h-1">
                          <div
                            class="bg-indigo-500 h-1 rounded-full transition-all duration-1000"
                            [style.width.%]="getTimeProgress(appointment.scheduled_at)">
                          </div>
                        </div>
                        <span class="text-xs text-slate-500">{{ getTimeRemaining(appointment.scheduled_at) }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <ng-template #noAppointments>
            <div class="text-center py-12">
              <i class="bi bi-calendar-plus text-5xl text-gray-300 mb-4"></i>
              <h4 class="text-lg font-medium text-slate-700 mb-2">Aucun rendez-vous à venir</h4>
              <p class="text-slate-500 mb-4">Votre planning est libre pour les prochains jours</p>
              <button class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm">
                <i class="bi bi-plus mr-2"></i>
                Planifier un RDV
              </button>
            </div>
          </ng-template>
        </div>
      </div>
    </div>
  `
})
export class UpcomingAppointmentsWidgetComponent implements OnInit, OnChanges {
  @Input() data: UpcomingAppointmentsData | null = null;
  @Input() loading: boolean = false;
  @Input() error: string | null = null;

  ngOnInit(): void {}

  ngOnChanges(changes: SimpleChanges): void {}

  trackAppointment(index: number, appointment: UpcomingAppointment): number {
    return appointment.id;
  }

  trackGroup(index: number, group: any): string {
    return group.date;
  }

  getAppointmentsByDay(): Array<{date: string, appointments: UpcomingAppointment[]}> {
    if (!this.data?.appointments?.length) return [];

    const grouped = this.data.appointments.reduce((groups: any, appointment) => {
      const date = new Date(appointment.scheduled_at).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(appointment);
      return groups;
    }, {});

    return Object.keys(grouped)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      .map(date => ({
        date,
        appointments: grouped[date].sort((a: UpcomingAppointment, b: UpcomingAppointment) =>
          new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
        )
      }));
  }

  getDayHeaderClass(dateString: string): string {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'bg-green-500';  // Aujourd'hui
    if (diffDays === 1) return 'bg-blue-500';  // Demain
    if (diffDays <= 3) return 'bg-indigo-500'; // Cette semaine
    return 'bg-gray-400'; // Plus tard
  }

  formatDayName(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { weekday: 'short' }).toUpperCase();
  }

  formatDayNumber(dateString: string): string {
    const date = new Date(dateString);
    return date.getDate().toString();
  }

  formatFullDate(dateString: string): string {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Aujourd\'hui';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Demain';
    } else {
      return date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });
    }
  }

  formatTime(dateTimeString: string): string {
    return new Date(dateTimeString).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatPriority(priority: string): string {
    const priorities: Record<string, string> = {
      'high': 'Urgent',
      'medium': 'Normal',
      'low': 'Faible'
    };
    return priorities[priority.toLowerCase()] || priority;
  }

  formatStatus(status: string): string {
    const statuses: Record<string, string> = {
      'scheduled': 'Planifié',
      'confirmed': 'Confirmé',
      'pending': 'En attente',
      'completed': 'Terminé',
      'cancelled': 'Annulé'
    };
    return statuses[status.toLowerCase()] || status;
  }

  getPriorityClass(priority: string): string {
    const classes: Record<string, string> = {
      'high': 'bg-red-100 text-red-800',
      'medium': 'bg-amber-100 text-amber-800',
      'low': 'bg-gray-100 text-gray-800'
    };
    return classes[priority.toLowerCase()] || 'bg-gray-100 text-gray-800';
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'scheduled': 'bg-blue-100 text-blue-800',
      'confirmed': 'bg-green-100 text-green-800',
      'pending': 'bg-amber-100 text-amber-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    return classes[status.toLowerCase()] || 'bg-gray-100 text-gray-800';
  }

  getDuration(appointment: UpcomingAppointment): string {
    // Par défaut, on suppose 1h si pas d'info
    return '1h00';
  }

  isToday(dateTimeString: string): boolean {
    const date = new Date(dateTimeString);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  getTimeProgress(dateTimeString: string): number {
    const appointmentTime = new Date(dateTimeString);
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const totalDayMs = endOfDay.getTime() - startOfDay.getTime();
    const elapsedMs = now.getTime() - startOfDay.getTime();

    return Math.min(100, (elapsedMs / totalDayMs) * 100);
  }

  getTimeRemaining(dateTimeString: string): string {
    const appointmentTime = new Date(dateTimeString);
    const now = new Date();
    const diffMs = appointmentTime.getTime() - now.getTime();

    if (diffMs < 0) return 'Passé';

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 0) {
      return `dans ${diffHours}h${diffMinutes > 0 ? ' ' + diffMinutes + 'min' : ''}`;
    } else if (diffMinutes > 0) {
      return `dans ${diffMinutes}min`;
    } else {
      return 'Maintenant';
    }
  }
}