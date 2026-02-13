import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RingoverService } from '../../../../../core/services/ringover.service';
import { RingoverCall } from '../../../../../core/interfaces/ringover.interface';
import { LoggingService } from '../../../../../core/logging/logging.service';

@Component({
  selector: 'app-ringover-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ringover-history.component.html',
  styleUrls: ['./ringover-history.component.scss']
})
export class RingoverHistoryComponent implements OnInit {
  public calls: RingoverCall[] = [];
  public isLoading = false;

  // Pagination
  public currentPage = 1;
  public pageSize = 10;
  Math = Math;

  constructor(
    private ringoverService: RingoverService,
    private loggingService: LoggingService
  ) {}

  ngOnInit(): void {
    this.fetchCallHistory();
  }

  fetchCallHistory(): void {
    this.isLoading = true;
    this.ringoverService.getCallHistory(100).subscribe({
      next: (calls) => {
        this.calls = calls;
        this.isLoading = false;
      },
      error: (err) => {
        this.loggingService.error('Error fetching Ringover data', err);
        this.isLoading = false;
      }
    });
  }

  // Helper to format the phone numbers for display
  formatNumber(num: string): string {
    return num.startsWith('33') ? `+33 ${num.substring(2)}` : `+${num}`;
  }

  // ── Pagination helpers ────────────────────────────────────────────────────

  get pagedCalls(): RingoverCall[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.calls.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.calls.length / this.pageSize);
  }

  get hasPagination(): boolean {
    return this.totalPages > 1;
  }

  get canGoPrevious(): boolean {
    return this.currentPage > 1;
  }

  get canGoNext(): boolean {
    return this.currentPage < this.totalPages;
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onPreviousPage(): void {
    if (this.canGoPrevious) this.onPageChange(this.currentPage - 1);
  }

  onNextPage(): void {
    if (this.canGoNext) this.onPageChange(this.currentPage + 1);
  }

  getPageNumbers(): number[] {
    const total = this.totalPages;
    const current = this.currentPage;
    const delta = 2;

    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const range: number[] = [];
    const start = Math.max(1, current - delta);
    const end = Math.min(total, current + delta);

    if (start > 1) {
      range.push(1);
      if (start > 2) range.push(-1); // ellipsis
    }

    for (let i = start; i <= end; i++) range.push(i);

    if (end < total) {
      if (end < total - 1) range.push(-1); // ellipsis
      range.push(total);
    }

    return range;
  }
}