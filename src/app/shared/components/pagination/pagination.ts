import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
}

@Component({
  selector: 'ui-pagination',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pagination.html',
  styleUrl: './pagination.scss'
})
export class Pagination {
  @Input() currentPage = 1;
  @Input() totalPages = 1;
  @Input() pageSize = 10;
  @Input() totalItems = 0;
  @Input() showSizeSelector = true;
  @Input() showInfo = true;
  @Input() maxVisiblePages = 5;
  @Input() pageSizeOptions = [10, 25, 50, 100];

  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  get visiblePages(): number[] {
    const pages: number[] = [];
    const half = Math.floor(this.maxVisiblePages / 2);
    let start = Math.max(1, this.currentPage - half);
    let end = Math.min(this.totalPages, start + this.maxVisiblePages - 1);

    if (end - start + 1 < this.maxVisiblePages) {
      start = Math.max(1, end - this.maxVisiblePages + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  }

  get startItem(): number {
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get endItem(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalItems);
  }

  get canGoPrevious(): boolean {
    return this.currentPage > 1;
  }

  get canGoNext(): boolean {
    return this.currentPage < this.totalPages;
  }

  onPageClick(page: number): void {
    if (page !== this.currentPage && page >= 1 && page <= this.totalPages) {
      this.pageChange.emit(page);
    }
  }

  onPreviousClick(): void {
    if (this.canGoPrevious) {
      this.pageChange.emit(this.currentPage - 1);
    }
  }

  onNextClick(): void {
    if (this.canGoNext) {
      this.pageChange.emit(this.currentPage + 1);
    }
  }

  onFirstClick(): void {
    if (this.currentPage !== 1) {
      this.pageChange.emit(1);
    }
  }

  onLastClick(): void {
    if (this.currentPage !== this.totalPages) {
      this.pageChange.emit(this.totalPages);
    }
  }

  onPageSizeChange(size: number): void {
    this.pageSizeChange.emit(size);
  }
}
