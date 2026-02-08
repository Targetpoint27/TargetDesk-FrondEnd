import { Component, Input, OnInit, OnChanges, SimpleChanges, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  TimelineItem,
  TimelineResponse,
  TimelineFilters,
  TimelineStats,
  TimelineType,
  TimelineExportResponse,
  TimelineExportRequest,
  ImportanceLevel,
  PrivacyLevel
} from '../../../domain/models/crm.models';
import { ManageTimelineUseCase } from '../../../domain/use-cases/crm/manage-timeline.use-case';
import { MessageService } from '../../services/message.service';
import { EnvironmentService } from '../../../core/config/environment.service';

@Component({
  selector: 'app-client-timeline',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="timeline-container">
      <!-- Header compact -->
      <div class="timeline-header">
        <div class="compact-header-row">
          <div class="title-section">
            <h3>
              <i class="bi bi-clock-history"></i>
              Historique des interactions
              <span class="total-count" *ngIf="stats()?.total_interactions">
                {{ stats()?.total_interactions }}
              </span>
            </h3>
          </div>

          <div class="filters-section">
            <select
              class="filter-select"
              [(ngModel)]="filters.type"
              (ngModelChange)="onFilterChange()">
              <option value="">Tous les types</option>
              <option value="note">📝 Notes</option>
              <option value="call">📞 Appels</option>
              <option value="appointment">📅 Rendez-vous</option>
              <option value="email">📧 Emails</option>
              <option value="opportunity">💼 Opportunités</option>
              <option value="modification">✏️ Modifications</option>
            </select>

            <select
              class="filter-select"
              (change)="onDateFilterChange($event)">
              <option value="">🗓️ Toutes les dates</option>
              <option value="today">Aujourd'hui</option>
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois</option>
              <option value="quarter">Ce trimestre</option>
              <option value="custom">Période personnalisée</option>
            </select>

            <input
              *ngIf="showDateInputs"
              type="date"
              class="filter-select"
              [(ngModel)]="filters.date_from"
              (ngModelChange)="onFilterChange()"
              placeholder="Du">

            <input
              *ngIf="showDateInputs"
              type="date"
              class="filter-select"
              [(ngModel)]="filters.date_to"
              (ngModelChange)="onFilterChange()"
              placeholder="Au">

            <button
              *ngIf="hasActiveFilters()"
              type="button"
              class="clear-filters-btn"
              (click)="clearFilters()"
              title="Effacer les filtres">
              <i class="bi bi-x-circle"></i>
              Effacer
            </button>

            <button
              type="button"
              class="export-btn"
              (click)="exportTimeline('csv')"
              [disabled]="isExporting()"
              title="Export CSV">
              <span *ngIf="isExporting()" class="loading-spinner"></span>
              <i *ngIf="!isExporting()" class="bi bi-download"></i>
              CSV
            </button>

            <button
              type="button"
              class="export-btn"
              (click)="exportTimeline('xlsx')"
              [disabled]="isExporting()"
              title="Export Excel">
              <i class="bi bi-file-earmark-excel"></i>
              Excel
            </button>
          </div>

          <!-- Stats chips compacts -->
          <div class="stats-section" *ngIf="stats() && getStatsArray().length > 0">
            @for (item of getStatsArray(); track item.type) {
              <div class="stat-chip" [class]="'stat-chip--' + item.type" (click)="filterByType(item.type)">
                <span class="type-label">{{ getTypeLabel(item.type) }}</span>
                <span class="count">{{ item.count }}</span>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Timeline Content -->
      <div class="timeline-content">
        <!-- Loading -->
        <div *ngIf="isLoading()" class="timeline-loading">
          <div class="loading-spinner"></div>
          <p>Chargement de l'historique...</p>
        </div>

        <!-- Empty State -->
        <div *ngIf="!isLoading() && timelineItems().length === 0" class="timeline-empty">
          <i class="bi bi-clock-history"></i>
          <h4>Aucune interaction</h4>
          <p>Aucune interaction trouvée pour cette période.</p>
        </div>

        <!-- Timeline Items -->
        <div *ngIf="!isLoading() && timelineItems().length > 0" class="timeline-list">
          @for (item of timelineItems(); track item.id) {
            <div class="timeline-item">
              <div class="timeline-indicator">
                <div class="timeline-icon" [class]="'timeline-icon--' + item.type">
                  <i [class]="getTypeIcon(item.type)"></i>
                </div>
              </div>

              <div class="timeline-content-item">
                <div class="timeline-header-item">
                  <div class="timeline-meta">
                    <h5 class="timeline-title">{{ item.title }}</h5>
                    <div class="timeline-badges">
                      <span class="type-badge" [class]="'type-badge--' + item.type">{{ getTypeLabel(item.type) }}</span>
                      <span
                        class="importance-badge"
                        *ngIf="item.importance_level !== 'normal'">
                        {{ getImportanceLabel(item.importance_level) }}
                      </span>
                      <span
                        class="privacy-badge"
                        *ngIf="item.privacy_level === 'private'">
                        <i class="bi bi-lock"></i>
                        Privé
                      </span>
                    </div>
                  </div>

                  <div class="timeline-time">
                    <span class="time-main">{{ formatDate(item.occurred_at) }}</span>
                  </div>
                </div>

                <div class="timeline-summary">
                  {{ item.summary }}
                </div>

                <div class="timeline-footer">
                  <div class="timeline-user">
                    <div class="user-avatar">
                      {{ getUserInitials(item.user.name) }}
                    </div>
                    <span class="user-name">{{ item.user.name }}</span>
                  </div>

                  <div class="timeline-metadata" *ngIf="item.metadata && hasRelevantMetadata(item.metadata)">
                    @for (meta of getMetadataItems(item.metadata); track meta.key) {
                      <div class="meta-item">
                        <strong>{{ meta.label }}:</strong> {{ meta.value }}
                      </div>
                    }
                  </div>

                </div>
              </div>
            </div>
          }
        </div>

        <!-- Pagination -->
        <div class="timeline-pagination" *ngIf="!isLoading() && timelineItems().length > 0">
          <button
            type="button"
            class="pagination-btn"
            [disabled]="currentPage() === 1"
            (click)="changePage(currentPage() - 1)">
            <i class="bi bi-chevron-left"></i>
          </button>

          <span class="pagination-info">
            Page {{ currentPage() }} sur {{ lastPage() }}
          </span>

          <button
            type="button"
            class="pagination-btn"
            [disabled]="currentPage() === lastPage()"
            (click)="changePage(currentPage() + 1)">
            <i class="bi bi-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrl: './client-timeline.component.scss'
})
export class ClientTimelineComponent implements OnInit, OnChanges {
  @Input() clientId: number | null = null;

  // Signals
  private timelineData = signal<TimelineResponse | null>(null);
  timelineItems = computed(() => this.timelineData()?.timeline?.data || []);
  stats = computed(() => this.timelineData()?.stats || null);
  currentPage = computed(() => this.timelineData()?.timeline?.current_page || 1);
  lastPage = computed(() => this.timelineData()?.timeline?.last_page || 1);
  totalItems = computed(() => this.timelineData()?.timeline?.total || 0);

  isLoading = signal(false);
  isExporting = signal(false);

  // Filtres
  filters: TimelineFilters = {};
  showDateInputs = false;

  constructor(
    private manageTimelineUseCase: ManageTimelineUseCase,
    private messageService: MessageService,
    private environmentService: EnvironmentService
  ) {}

  ngOnInit(): void {
    this.loadTimeline();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['clientId'] && this.clientId) {
      this.clearFilters();
      this.loadTimeline();
    }
  }

  loadTimeline(): void {
    if (!this.clientId) return;

    this.isLoading.set(true);
    const params = { ...this.filters };

    this.manageTimelineUseCase.getClientTimeline(this.clientId, params)
      .subscribe({
        next: (response) => {
          this.timelineData.set(response);
          this.isLoading.set(false);
        },
        error: (error) => {
          this.messageService.showError('Erreur lors du chargement de l\'historique');
          this.isLoading.set(false);
          console.error('Error loading timeline:', error);
        }
      });
  }

  onFilterChange(): void {
    this.filters.page = 1; // Reset to first page when filtering
    this.loadTimeline();
  }

  onDateFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const value = select.value;

    this.showDateInputs = value === 'custom';

    if (value && value !== 'custom') {
      const dates = this.getDateRange(value);
      this.filters.date_from = dates.from;
      this.filters.date_to = dates.to;
    } else if (value === '') {
      this.filters.date_from = undefined;
      this.filters.date_to = undefined;
      this.showDateInputs = false;
    }

    if (value !== 'custom') {
      this.filters.page = 1; // Reset to first page when filtering
      this.loadTimeline();
    }
  }

  clearFilters(): void {
    this.filters = {};
    this.showDateInputs = false;
    this.loadTimeline();
  }

  hasActiveFilters(): boolean {
    return !!(this.filters.type || this.filters.date_from || this.filters.date_to);
  }

  changePage(page: number): void {
    this.filters.page = page;
    this.filters.per_page = 20; // Ensure per_page is set
    this.loadTimeline();
  }

  exportTimeline(format: 'csv' | 'xlsx'): void {
    if (!this.clientId) return;

    this.isExporting.set(true);

    // Étape 1: Obtenir les métadonnées d'export (aperçu)
    const exportRequest: TimelineExportRequest = {
      format,
      ...this.filters
    };

    this.manageTimelineUseCase.exportTimeline(this.clientId, exportRequest)
      .subscribe({
        next: (response: TimelineExportResponse) => {
          // Si aucune donnée, afficher un message approprié
          if (response.records_count === 0) {
            this.messageService.showInfo('Aucune donnée à exporter pour ce client');
            this.isExporting.set(false);
            return;
          }

          // Étape 2: Télécharger directement le fichier via l'API
          this.downloadDirectlyFromApi(format, response.filename, response.records_count);
        },
        error: (error) => {
          this.handleExportError(error);
        }
      });
  }

  private downloadDirectlyFromApi(format: 'csv' | 'xlsx', filename: string, recordsCount: number): void {
    if (!this.clientId) {
      this.messageService.showError('Client ID manquant');
      this.isExporting.set(false);
      return;
    }

    // Téléchargement direct via l'API avec paramètre download=true
    const exportRequest: TimelineExportRequest = {
      format,
      ...this.filters
    };

    // Utiliser le use case qui gère automatiquement l'authentification
    this.manageTimelineUseCase.downloadTimelineFile(this.clientId, exportRequest)
      .subscribe({
        next: (blob: Blob) => {
          // Créer un lien de téléchargement et déclencher le téléchargement
          this.saveBlobAsFile(blob, filename);

          this.messageService.showSuccess(`Export ${format.toUpperCase()} généré (${recordsCount} enregistrements)`);
          this.isExporting.set(false);
        },
        error: (error) => {
          console.error('Erreur lors du téléchargement direct:', error);
          this.handleExportError(error);
        }
      });
  }

  private saveBlobAsFile(blob: Blob, filename: string): void {
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(objectUrl);
  }


  private handleExportError(error: any): void {
    this.isExporting.set(false);
    console.error('Export error:', error);

    switch (error.status) {
      case 401:
        this.messageService.showError('Authentification requise');
        break;
      case 403:
        this.messageService.showError('Accès non autorisé');
        break;
      case 404:
        this.messageService.showError('Client non trouvé');
        break;
      case 422:
        if (error.error?.errors?.format) {
          this.messageService.showError('Format d\'export invalide');
        } else {
          this.messageService.showError('Paramètres invalides');
        }
        break;
      default:
        if (error.error?.data?.records_count === 0) {
          this.messageService.showInfo('Aucune donnée à exporter pour ce client');
        } else {
          this.messageService.showError('Erreur lors de l\'export. Veuillez réessayer.');
        }
    }
  }

  // Utility methods
  getStatsArray() {
    const stats = this.stats();
    if (!stats?.by_type) return [];

    return Object.entries(stats.by_type).map(([type, count]) => ({
      type: type as TimelineType,
      count
    }));
  }

  getTypeIcon(type: TimelineType): string {
    const icons = {
      note: 'bi bi-journal-text',
      call: 'bi bi-telephone',
      appointment: 'bi bi-calendar-event',
      email: 'bi bi-envelope',
      opportunity: 'bi bi-graph-up-arrow',
      modification: 'bi bi-pencil-square'
    };
    return icons[type] || 'bi bi-circle';
  }

  getTypeLabel(type: TimelineType): string {
    const labels = {
      note: 'Note',
      call: 'Appel',
      appointment: 'RDV',
      email: 'Email',
      opportunity: 'Opportunité',
      modification: 'Modification'
    };
    return labels[type] || type;
  }

  getImportanceLabel(level: ImportanceLevel): string {
    const labels = {
      low: 'Faible',
      normal: 'Normal',
      high: 'Important',
      critical: 'Critique'
    };
    return labels[level] || level;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Aujourd'hui à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return `Hier à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays < 7) {
      return `Il y a ${diffDays} jours`;
    } else {
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }

  hasRelevantMetadata(metadata: any): boolean {
    if (!metadata) return false;
    const relevantKeys = ['attachments_count', 'is_pinned', 'duration', 'outcome', 'follow_up_required', 'status', 'location'];
    return relevantKeys.some(key => metadata[key] !== undefined && metadata[key] !== null);
  }

  getMetadataItems(metadata: any) {
    const items = [];

    if (metadata.attachments_count) {
      items.push({ key: 'attachments', label: 'Pièces jointes', value: metadata.attachments_count });
    }
    if (metadata.is_pinned) {
      items.push({ key: 'pinned', label: 'Épinglé', value: 'Oui' });
    }
    if (metadata.duration) {
      items.push({ key: 'duration', label: 'Durée', value: `${metadata.duration} min` });
    }
    if (metadata.outcome) {
      items.push({ key: 'outcome', label: 'Résultat', value: metadata.outcome });
    }
    if (metadata.follow_up_required) {
      items.push({ key: 'followup', label: 'Suivi requis', value: 'Oui' });
    }
    if (metadata.status) {
      items.push({ key: 'status', label: 'Statut', value: metadata.status });
    }
    if (metadata.location) {
      items.push({ key: 'location', label: 'Lieu', value: metadata.location });
    }

    return items;
  }

  getDetailUrl(item: TimelineItem): string {
    const baseUrl = this.environmentService.api.baseUrl;
    const typeMap = {
      note: 'notes',
      call: 'calls',
      appointment: 'appointments',
      email: 'emails',
      opportunity: 'opportunities',
      modification: 'modifications'
    };
    return `${baseUrl}/${typeMap[item.type] || item.type}/${item.id}`;
  }

  getDisplayRange(): string {
    const current = this.currentPage();
    const perPage = 20;
    const total = this.totalItems();
    const start = (current - 1) * perPage + 1;
    const end = Math.min(current * perPage, total);
    return `${start}-${end}`;
  }

  getUserInitials(name: string): string {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  filterByType(type: TimelineType): void {
    this.filters.type = this.filters.type === type ? undefined : type;
    this.onFilterChange();
  }

  canEditItem(item: TimelineItem): boolean {
    // Pour l'instant, on autorise l'édition de tous les éléments
    // Dans une vraie app, on vérifierait les permissions utilisateur
    return ['note', 'call', 'appointment'].includes(item.type);
  }

  editItem(item: TimelineItem): void {
    // Pour l'instant, on affiche un message informatif
    // Dans une vraie implémentation, on ouvrirait une modal d'édition ou on naviguerait vers une page d'édition
    this.messageService.showInfo(`Édition de ${this.getTypeLabel(item.type).toLowerCase()} : ${item.title}`);

    // TODO: Implémenter la logique d'édition selon le type d'élément
    // - Notes: ouvrir modal d'édition de note
    // - Appels: ouvrir modal d'édition d'appel
    // - Rendez-vous: ouvrir modal d'édition de rendez-vous
    console.log('Edit item:', item);
  }

  private getDateRange(period: string): { from: string; to: string } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (period) {
      case 'today':
        return {
          from: today.toISOString().split('T')[0],
          to: today.toISOString().split('T')[0]
        };
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay() + 1);
        return {
          from: weekStart.toISOString().split('T')[0],
          to: today.toISOString().split('T')[0]
        };
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return {
          from: monthStart.toISOString().split('T')[0],
          to: today.toISOString().split('T')[0]
        };
      case 'quarter':
        const quarterMonth = Math.floor(today.getMonth() / 3) * 3;
        const quarterStart = new Date(today.getFullYear(), quarterMonth, 1);
        return {
          from: quarterStart.toISOString().split('T')[0],
          to: today.toISOString().split('T')[0]
        };
      default:
        return { from: '', to: '' };
    }
  }
}