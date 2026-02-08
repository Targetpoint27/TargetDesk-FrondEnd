import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-soft-widget',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white/60 backdrop-blur-sm rounded-xl border border-white/40 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">

      <!-- Header -->
      <div class="px-4 py-3 border-b border-gray-100/50">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div *ngIf="icon" class="w-8 h-8 rounded-lg flex items-center justify-center"
                 [style.background]="iconBg">
              <i [class]="icon + ' text-white text-sm'"></i>
            </div>
            <div>
              <h3 class="text-base font-semibold text-slate-800">{{ title }}</h3>
              <p *ngIf="subtitle" class="text-sm text-slate-500 mt-0.5">{{ subtitle }}</p>
            </div>
          </div>

          <div class="flex items-center space-x-2">
            <!-- Badge -->
            <span *ngIf="badge" class="px-2.5 py-1 rounded-full text-xs font-medium"
                  [class]="badgeClass">
              {{ badge }}
            </span>

            <!-- Actions -->
            <div class="flex items-center space-x-1">
              <button *ngIf="showRefresh"
                      (click)="onRefresh()"
                      [disabled]="loading"
                      class="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all duration-200">
                <i class="bi text-xs"
                   [class.bi-arrow-clockwise]="!loading"
                   [class.bi-hourglass]="loading"
                   [class.animate-spin]="loading"></i>
              </button>

              <button *ngIf="showSettings"
                      (click)="onSettings()"
                      class="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all duration-200">
                <i class="bi bi-three-dots text-xs"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="p-4">
        <!-- Loading State -->
        <div *ngIf="loading && !hasContent" class="flex items-center justify-center py-4">
          <div class="flex items-center space-x-3 text-slate-500">
            <div class="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
            <span class="text-sm">{{ loadingText || 'Chargement...' }}</span>
          </div>
        </div>

        <!-- Error State -->
        <div *ngIf="error && !hasContent" class="text-center py-4">
          <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <i class="bi bi-exclamation-triangle text-red-500"></i>
          </div>
          <p class="text-sm text-slate-600 mb-3">{{ error }}</p>
          <button *ngIf="showRefresh"
                  (click)="onRefresh()"
                  class="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs rounded-lg transition-colors">
            Réessayer
          </button>
        </div>

        <!-- Empty State -->
        <div *ngIf="isEmpty && !loading && !error" class="text-center py-4">
          <div class="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <i [class]="emptyIcon" class="text-slate-400"></i>
          </div>
          <p class="text-sm text-slate-500 mb-2">{{ emptyTitle || 'Aucune donnée' }}</p>
          <p class="text-xs text-slate-400">{{ emptyMessage || 'Les données apparaîtront ici' }}</p>
        </div>

        <!-- Content -->
        <div *ngIf="hasContent && !loading && !error" class="space-y-3">
          <ng-content></ng-content>
        </div>
      </div>

      <!-- Footer -->
      <div *ngIf="hasFooter" class="px-4 py-3 bg-slate-50/50 border-t border-gray-100/50">
        <ng-content select="[slot=footer]"></ng-content>
      </div>
    </div>
  `
})
export class SoftWidgetComponent {
  @Input() title: string = '';
  @Input() subtitle?: string;
  @Input() icon?: string;
  @Input() iconBg: string = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  @Input() badge?: string;
  @Input() badgeClass: string = 'bg-blue-100 text-blue-700';

  @Input() loading: boolean = false;
  @Input() loadingText?: string;
  @Input() error?: string;
  @Input() isEmpty: boolean = false;
  @Input() hasContent: boolean = true;
  @Input() hasFooter: boolean = false;

  @Input() emptyIcon: string = 'bi-inbox';
  @Input() emptyTitle?: string;
  @Input() emptyMessage?: string;

  @Input() showRefresh: boolean = true;
  @Input() showSettings: boolean = false;

  @Output() refresh = new EventEmitter<void>();
  @Output() settings = new EventEmitter<void>();

  onRefresh(): void {
    this.refresh.emit();
  }

  onSettings(): void {
    this.settings.emit();
  }
}