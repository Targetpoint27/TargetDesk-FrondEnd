import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RecentInteraction } from '../../interfaces/dashboard.interface';

@Component({
  selector: 'app-interaction-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-2">
      <div *ngFor="let interaction of interactions; trackBy: trackInteraction"
           class="group flex items-start space-x-3 p-3 rounded-lg hover:bg-white/60 transition-all duration-200">

        <!-- Avatar/Icon -->
        <div class="flex-shrink-0">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center"
               [style.background]="getTypeGradient(interaction.type)">
            <i [class]="getTypeIcon(interaction.type)" class="text-white text-sm"></i>
          </div>
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between">
            <div class="flex-1 min-w-0">
              <!-- Title -->
              <h4 class="font-medium text-slate-800 text-sm leading-5 group-hover:text-slate-900 transition-colors">
                {{ interaction.subject }}
              </h4>

              <!-- Client -->
              <p class="text-slate-600 text-sm mt-1 flex items-center">
                <i class="bi bi-person text-slate-400 mr-1.5 text-xs"></i>
                {{ interaction.client_name }}
              </p>

              <!-- Summary -->
              <p *ngIf="interaction.summary"
                 class="text-slate-500 text-xs mt-2 line-clamp-2 leading-relaxed">
                {{ interaction.summary }}
              </p>

              <!-- Meta info -->
              <div class="flex items-center space-x-4 mt-2">
                <span class="flex items-center text-xs text-slate-400">
                  <i class="bi bi-clock mr-1"></i>
                  {{ formatTime(interaction.created_at) }}
                </span>
                <span class="flex items-center text-xs text-slate-400">
                  <i class="bi bi-person-badge mr-1"></i>
                  {{ interaction.created_by }}
                </span>
                <span class="px-2 py-0.5 rounded-full text-xs font-medium"
                      [class]="getTypeClass(interaction.type)">
                  {{ formatType(interaction.type) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `]
})
export class InteractionListComponent {
  @Input() interactions: RecentInteraction[] = [];

  trackInteraction(index: number, interaction: RecentInteraction): number {
    return interaction.id;
  }

  getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      'call': 'bi-telephone',
      'email': 'bi-envelope',
      'meeting': 'bi-people',
      'visit': 'bi-geo-alt',
      'demo': 'bi-display',
      'follow_up': 'bi-arrow-clockwise'
    };
    return icons[type.toLowerCase()] || 'bi-chat-dots';
  }

  getTypeGradient(type: string): string {
    const gradients: Record<string, string> = {
      'call': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      'email': 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
      'meeting': 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
      'visit': 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      'demo': 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
      'follow_up': 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
    };
    return gradients[type.toLowerCase()] || 'linear-gradient(135deg, #64748b 0%, #475569 100%)';
  }

  getTypeClass(type: string): string {
    const classes: Record<string, string> = {
      'call': 'bg-green-100 text-green-700',
      'email': 'bg-blue-100 text-blue-700',
      'meeting': 'bg-purple-100 text-purple-700',
      'visit': 'bg-amber-100 text-amber-700',
      'demo': 'bg-pink-100 text-pink-700',
      'follow_up': 'bg-indigo-100 text-indigo-700'
    };
    return classes[type.toLowerCase()] || 'bg-gray-100 text-gray-700';
  }

  formatType(type: string): string {
    const types: Record<string, string> = {
      'call': 'Appel',
      'email': 'Email',
      'meeting': 'Réunion',
      'visit': 'Visite',
      'demo': 'Démo',
      'follow_up': 'Suivi'
    };
    return types[type.toLowerCase()] || type;
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'À l\'instant';
    if (diffMinutes < 60) return `${diffMinutes}min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}j`;

    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit'
    });
  }
}