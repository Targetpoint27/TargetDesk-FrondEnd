import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-metric-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="group relative bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/40 shadow-sm hover:shadow-lg hover:bg-white/80 transition-all duration-300">
      <!-- Background subtle gradient -->
      <div class="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300"
           [style.background-image]="gradientBg"></div>

      <div class="relative z-10">
        <!-- Icon -->
        <div class="w-10 h-10 rounded-lg mb-3 flex items-center justify-center transition-transform duration-300 group-hover:scale-105"
             [style.background]="iconBg">
          <i [class]="icon + ' text-white text-lg'"></i>
        </div>

        <!-- Value -->
        <div class="mb-1">
          <span class="text-xl font-bold text-slate-800 tracking-tight">{{ value | number }}</span>
          <span *ngIf="suffix" class="text-sm text-slate-500 ml-1">{{ suffix }}</span>
        </div>

        <!-- Label -->
        <div class="text-sm font-medium text-slate-600 mb-2">{{ label }}</div>

        <!-- Trend or additional info -->
        <div class="flex items-center justify-between">
          <div *ngIf="trend !== undefined" class="flex items-center space-x-1"
               [class.text-green-600]="trend >= 0"
               [class.text-red-500]="trend < 0">
            <i class="text-xs"
               [class.bi-arrow-up]="trend >= 0"
               [class.bi-arrow-down]="trend < 0"></i>
            <span class="text-xs font-medium">{{ Math.abs(trend).toFixed(1) }}%</span>
          </div>

          <div *ngIf="badge" class="px-2 py-1 rounded-full text-xs font-medium"
               [class]="badgeClass">
            {{ badge }}
          </div>
        </div>
      </div>
    </div>
  `
})
export class MetricCardComponent {
  @Input() icon: string = 'bi-graph-up';
  @Input() iconBg: string = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  @Input() gradientBg: string = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  @Input() value: number = 0;
  @Input() suffix?: string;
  @Input() label: string = '';
  @Input() trend?: number;
  @Input() badge?: string;
  @Input() badgeClass: string = 'bg-blue-100 text-blue-700';

  Math = Math;
}