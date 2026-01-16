import { Pipe, PipeTransform } from '@angular/core';
import { StringUtils, DateUtils } from '../utils';

// Truncate Pipe
@Pipe({
  name: 'truncate',
  standalone: true,
  pure: true,
})
export class TruncatePipe implements PipeTransform {
  transform(value: string, length: number = 50, suffix: string = '...'): string {
    if (!value) return '';
    return StringUtils.truncate(value, length, suffix);
  }
}

// Capitalize Pipe
@Pipe({
  name: 'capitalize',
  standalone: true,
  pure: true,
})
export class CapitalizePipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return '';
    return StringUtils.capitalize(value);
  }
}

// File Size Pipe
@Pipe({
  name: 'fileSize',
  standalone: true,
  pure: true,
})
export class FileSizePipe implements PipeTransform {
  transform(bytes: number): string {
    if (!bytes) return '0 B';

    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = bytes / Math.pow(1024, i);

    return `${size.toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
  }
}

// Relative Time Pipe
@Pipe({
  name: 'relativeTime',
  standalone: true,
  pure: false,
})
export class RelativeTimePipe implements PipeTransform {
  transform(value: Date | string): string {
    if (!value) return '';
    return DateUtils.getRelativeTime(value);
  }
}

// Safe HTML Pipe
@Pipe({
  name: 'safeHtml',
  standalone: true,
  pure: true,
})
export class SafeHtmlPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return '';
    // Basic HTML sanitization - remove script tags and events
    return value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/g, '');
  }
}

// Search Filter Pipe
@Pipe({
  name: 'search',
  standalone: true,
  pure: false,
})
export class SearchPipe implements PipeTransform {
  transform<T extends Record<string, any>>(items: T[], searchTerm: string, fields?: (keyof T)[]): T[] {
    if (!items || !searchTerm) return items;

    const term = searchTerm.toLowerCase();

    return items.filter(item => {
      if (fields) {
        return fields.some(field =>
          String(item[field]).toLowerCase().includes(term)
        );
      } else {
        return Object.values(item).some(value =>
          String(value).toLowerCase().includes(term)
        );
      }
    });
  }
}

// Sort Pipe
@Pipe({
  name: 'sort',
  standalone: true,
  pure: false,
})
export class SortPipe implements PipeTransform {
  transform<T>(items: T[], field: keyof T, order: 'asc' | 'desc' = 'asc'): T[] {
    if (!items || !field) return items;

    return [...items].sort((a, b) => {
      const aVal = a[field];
      const bVal = b[field];

      if (aVal < bVal) return order === 'asc' ? -1 : 1;
      if (aVal > bVal) return order === 'asc' ? 1 : -1;
      return 0;
    });
  }
}

// Highlight Search Pipe
@Pipe({
  name: 'highlight',
  standalone: true,
  pure: true,
})
export class HighlightPipe implements PipeTransform {
  transform(text: string, search: string): string {
    if (!text || !search) return text;

    const regex = new RegExp(`(${search})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }
}

// Export all pipes
export const SHARED_PIPES = [
  TruncatePipe,
  CapitalizePipe,
  FileSizePipe,
  RelativeTimePipe,
  SafeHtmlPipe,
  SearchPipe,
  SortPipe,
  HighlightPipe
] as const;