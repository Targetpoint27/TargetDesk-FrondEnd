import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TodayTasksData, TodayAppointment, TodayFollowUp } from '../../interfaces/dashboard.interface';

@Component({
  selector: 'app-today-tasks-widget',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <!-- Header -->
      <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 p-6">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-slate-800 flex items-center">
              <i class="bi bi-calendar-check text-blue-600 mr-2"></i>
              À faire aujourd'hui
            </h3>
            <p class="text-sm text-slate-600 mt-1">Vos tâches et rendez-vous</p>
          </div>
          <div class="text-right">
            <div class="text-2xl font-bold text-blue-600">{{ getTotalTasks() }}</div>
            <div class="text-xs text-slate-500">tâches</div>
          </div>
        </div>

        <!-- Summary Cards -->
        <div *ngIf="data?.summary" class="grid grid-cols-4 gap-4 mt-4">
          <div class="bg-white rounded-lg p-3 text-center">
            <div class="text-lg font-bold text-blue-600">{{ data?.summary?.total_appointments_today }}</div>
            <div class="text-xs text-slate-600">RDV</div>
          </div>
          <div class="bg-white rounded-lg p-3 text-center">
            <div class="text-lg font-bold text-amber-600">{{ data?.summary?.total_follow_ups_due }}</div>
            <div class="text-xs text-slate-600">Relances</div>
          </div>
          <div class="bg-white rounded-lg p-3 text-center">
            <div class="text-lg font-bold text-red-600">{{ data?.summary?.urgent_tasks }}</div>
            <div class="text-xs text-slate-600">Urgent</div>
          </div>
          <div class="bg-white rounded-lg p-3 text-center">
            <div class="text-lg font-bold text-green-600">{{ data?.summary?.completion_rate?.toFixed(1) }}%</div>
            <div class="text-xs text-slate-600">Complété</div>
          </div>
        </div>
      </div>

      <div class="p-6">
        <!-- Loading State -->
        <div *ngIf="loading" class="flex items-center justify-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span class="ml-3 text-slate-600">Chargement des tâches...</span>
        </div>

        <!-- Error State -->
        <div *ngIf="error" class="text-center py-8">
          <i class="bi bi-exclamation-triangle text-4xl text-red-400 mb-2"></i>
          <p class="text-slate-600">{{ error }}</p>
        </div>

        <!-- Content -->
        <div *ngIf="!loading && !error" class="space-y-6">

          <!-- Rendez-vous du jour -->
          <div>
            <div class="flex items-center justify-between mb-4">
              <h4 class="font-semibold text-slate-700 flex items-center">
                <i class="bi bi-calendar-event text-blue-500 mr-2"></i>
                Rendez-vous du jour
                <span class="ml-2 bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs font-medium">
                  {{ data?.appointments_today?.length || 0 }}
                </span>
              </h4>
            </div>

            <div *ngIf="data?.appointments_today?.length; else noAppointments" class="space-y-3">
              <div
                *ngFor="let appointment of data?.appointments_today; trackBy: trackAppointment"
                class="flex items-start p-4 bg-blue-50/50 border border-blue-100 rounded-lg hover:bg-blue-50 transition-colors">

                <div class="flex-shrink-0 mr-4">
                  <div [class]="getAppointmentIconClass(appointment)" class="w-10 h-10 rounded-lg flex items-center justify-center">
                    <i [class]="getAppointmentIcon(appointment)" class="text-white"></i>
                  </div>
                </div>

                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <h5 class="font-medium text-slate-800">{{ appointment.subject }}</h5>
                      <p class="text-sm text-slate-600 mt-1">{{ appointment.client_name }}</p>
                      <div class="flex items-center space-x-4 mt-2 text-xs text-slate-500">
                        <span class="flex items-center">
                          <i class="bi bi-clock mr-1"></i>
                          {{ formatTime(appointment.scheduled_at) }}
                        </span>
                        <span *ngIf="appointment.location" class="flex items-center">
                          <i class="bi bi-geo-alt mr-1"></i>
                          {{ appointment.location }}
                        </span>
                      </div>
                    </div>
                    <div class="flex flex-col items-end space-y-2">
                      <span [class]="getPriorityClass(appointment.priority)" class="px-2 py-1 rounded text-xs font-medium">
                        {{ formatPriority(appointment.priority) }}
                      </span>
                      <span [class]="getStatusClass(appointment.status)" class="px-2 py-1 rounded text-xs font-medium">
                        {{ formatStatus(appointment.status) }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <ng-template #noAppointments>
              <div class="text-center py-8 bg-gray-50 rounded-lg">
                <i class="bi bi-calendar-x text-3xl text-gray-400 mb-2"></i>
                <p class="text-slate-500 text-sm">Aucun rendez-vous prévu aujourd'hui</p>
              </div>
            </ng-template>
          </div>

          <!-- Relances en retard -->
          <div>
            <div class="flex items-center justify-between mb-4">
              <h4 class="font-semibold text-slate-700 flex items-center">
                <i class="bi bi-exclamation-triangle text-amber-500 mr-2"></i>
                Relances en retard
                <span class="ml-2 bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-xs font-medium">
                  {{ data?.follow_ups_due?.length || 0 }}
                </span>
              </h4>
            </div>

            <div *ngIf="data?.follow_ups_due?.length; else noFollowUps" class="space-y-3">
              <div
                *ngFor="let followUp of data?.follow_ups_due; trackBy: trackFollowUp"
                class="flex items-start p-4 bg-amber-50/50 border border-amber-100 rounded-lg hover:bg-amber-50 transition-colors">

                <div class="flex-shrink-0 mr-4">
                  <div class="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
                    <span class="text-white font-bold text-sm">{{ followUp.days_overdue }}j</span>
                  </div>
                </div>

                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <h5 class="font-medium text-slate-800">{{ followUp.subject }}</h5>
                      <p class="text-sm text-slate-600 mt-1">{{ followUp.client_name }}</p>
                      <div class="flex items-center space-x-4 mt-2 text-xs text-slate-500">
                        <span class="flex items-center">
                          <i class="bi bi-calendar-x mr-1"></i>
                          Prévu le {{ formatDate(followUp.follow_up_date) }}
                        </span>
                        <span class="text-amber-600 font-medium">
                          {{ followUp.days_overdue }} jour(s) de retard
                        </span>
                      </div>
                    </div>
                    <div class="flex flex-col items-end space-y-2">
                      <span [class]="getPriorityClass(followUp.priority)" class="px-2 py-1 rounded text-xs font-medium">
                        {{ formatPriority(followUp.priority) }}
                      </span>
                      <button class="px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs rounded transition-colors">
                        Traiter
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <ng-template #noFollowUps>
              <div class="text-center py-8 bg-gray-50 rounded-lg">
                <i class="bi bi-check-circle text-3xl text-green-400 mb-2"></i>
                <p class="text-slate-500 text-sm">Aucune relance en retard</p>
              </div>
            </ng-template>
          </div>

        </div>
      </div>
    </div>
  `
})
export class TodayTasksWidgetComponent implements OnInit, OnChanges {
  @Input() data: TodayTasksData | null = null;
  @Input() loading: boolean = false;
  @Input() error: string | null = null;

  ngOnInit(): void {}

  ngOnChanges(changes: SimpleChanges): void {}

  getTotalTasks(): number {
    if (!this.data?.summary) return 0;
    return (this.data?.summary.total_appointments_today || 0) + (this.data?.summary.total_follow_ups_due || 0);
  }

  trackAppointment(index: number, appointment: TodayAppointment): number {
    return appointment.id;
  }

  trackFollowUp(index: number, followUp: TodayFollowUp): number {
    return followUp.id;
  }

  formatTime(dateTimeString: string): string {
    return new Date(dateTimeString).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit'
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

  getAppointmentIcon(appointment: TodayAppointment): string {
    const icons: Record<string, string> = {
      'meeting': 'bi-people',
      'call': 'bi-telephone',
      'demo': 'bi-display',
      'visit': 'bi-geo-alt'
    };
    return icons[appointment.subject?.toLowerCase().includes('meeting') ? 'meeting' : 'meeting'] || 'bi-calendar-event';
  }

  getAppointmentIconClass(appointment: TodayAppointment): string {
    const priority = appointment.priority.toLowerCase();
    const baseClass = 'w-10 h-10 rounded-lg flex items-center justify-center';

    if (priority === 'high') return `${baseClass} bg-red-500`;
    if (priority === 'medium') return `${baseClass} bg-amber-500`;
    return `${baseClass} bg-blue-500`;
  }
}