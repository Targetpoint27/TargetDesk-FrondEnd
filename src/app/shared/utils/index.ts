// Date Utils
export class DateUtils {
  static formatDate(date: Date | string, format: 'short' | 'long' | 'iso' = 'short'): string {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    switch (format) {
      case 'short':
        return d.toLocaleDateString();
      case 'long':
        return d.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      case 'iso':
        return d.toISOString().split('T')[0];
      default:
        return d.toLocaleDateString();
    }
  }

  static formatDateTime(date: Date | string): string {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString();
  }

  static getRelativeTime(date: Date | string): string {
    const d = new Date(date);
    const now = new Date();
    const diffInMs = now.getTime() - d.getTime();
    const diffInSecs = Math.floor(diffInMs / 1000);
    const diffInMins = Math.floor(diffInSecs / 60);
    const diffInHours = Math.floor(diffInMins / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInDays > 0) return `il y a ${diffInDays} jour${diffInDays > 1 ? 's' : ''}`;
    if (diffInHours > 0) return `il y a ${diffInHours} heure${diffInHours > 1 ? 's' : ''}`;
    if (diffInMins > 0) return `il y a ${diffInMins} minute${diffInMins > 1 ? 's' : ''}`;
    return '� l\'instant';
  }

  static isToday(date: Date | string): boolean {
    const d = new Date(date);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }

  static addDays(date: Date | string, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }
}

// String Utils
export class StringUtils {
  static capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  static camelCase(str: string): string {
    return str.replace(/[-_\s]+(.)?/g, (_, char) => char ? char.toUpperCase() : '');
  }

  static kebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }

  static snakeCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .replace(/[\s-]+/g, '_')
      .toLowerCase();
  }

  static truncate(str: string, length: number, suffix = '...'): string {
    if (str.length <= length) return str;
    return str.substring(0, length - suffix.length) + suffix;
  }

  static slugify(str: string): string {
    return str
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/[\s-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  static generateId(length = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

// Array Utils
export class ArrayUtils {
  static unique<T>(array: T[]): T[] {
    return [...new Set(array)];
  }

  static uniqueBy<T>(array: T[], key: keyof T): T[] {
    const seen = new Set();
    return array.filter(item => {
      const value = item[key];
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  }

  static groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const group = String(item[key]);
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }

  static sortBy<T>(array: T[], key: keyof T, order: 'asc' | 'desc' = 'asc'): T[] {
    return [...array].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];

      if (aVal < bVal) return order === 'asc' ? -1 : 1;
      if (aVal > bVal) return order === 'asc' ? 1 : -1;
      return 0;
    });
  }

  static chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  static shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

// Object Utils
export class ObjectUtils {
  static deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  static isEmpty(obj: any): boolean {
    if (obj == null) return true;
    if (Array.isArray(obj)) return obj.length === 0;
    if (typeof obj === 'object') return Object.keys(obj).length === 0;
    return false;
  }

  static pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
    const result = {} as Pick<T, K>;
    keys.forEach(key => {
      if (key in obj) {
        result[key] = obj[key];
      }
    });
    return result;
  }

  static omit<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
    const result = { ...obj };
    keys.forEach(key => delete result[key]);
    return result;
  }

  static merge<T extends object>(target: T, ...sources: Partial<T>[]): T {
    return Object.assign({}, target, ...sources);
  }

  static get(obj: any, path: string, defaultValue?: any): any {
    const keys = path.split('.');
    let result = obj;

    for (const key of keys) {
      if (result == null) return defaultValue;
      result = result[key];
    }

    return result !== undefined ? result : defaultValue;
  }
}

// Storage Utils
export class StorageUtils {
  static setItem(key: string, value: any, storage: Storage = localStorage): void {
    try {
      storage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn('Failed to save to storage:', error);
    }
  }

  static getItem<T>(key: string, defaultValue: T | null = null, storage: Storage = localStorage): T | null {
    try {
      const item = storage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn('Failed to retrieve from storage:', error);
      return defaultValue;
    }
  }

  static removeItem(key: string, storage: Storage = localStorage): void {
    try {
      storage.removeItem(key);
    } catch (error) {
      console.warn('Failed to remove from storage:', error);
    }
  }

  static clear(storage: Storage = localStorage): void {
    try {
      storage.clear();
    } catch (error) {
      console.warn('Failed to clear storage:', error);
    }
  }

  static hasItem(key: string, storage: Storage = localStorage): boolean {
    return storage.getItem(key) !== null;
  }
}

// Validation Utils
export class ValidationUtils {
  static isRequired(value: any): boolean {
    if (value == null) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  }

  static minLength(value: any, min: number): boolean {
    if (!value) return false;
    if (typeof value === 'string') return value.length >= min;
    if (typeof value === 'boolean') return false;
    if (Array.isArray(value)) return value.length >= min;
    return false;
  }

  static maxLength(value: string, max: number): boolean {
    return !value || value.length <= max;
  }

  static isEmail(value: string): boolean {
    return StringUtils.isValidEmail(value);
  }

  static isUrl(value: string): boolean {
    return StringUtils.isValidUrl(value);
  }

  static isNumeric(value: string): boolean {
    return !isNaN(Number(value)) && !isNaN(parseFloat(value));
  }

  static isInteger(value: string): boolean {
    return Number.isInteger(Number(value));
  }

  static inRange(value: number, min: number, max: number): boolean {
    return value >= min && value <= max;
  }

  static matches(value: string, pattern: RegExp): boolean {
    return pattern.test(value);
  }
}

// Constants
export const HTTP_STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const;

export const ERROR_MESSAGES = {
  REQUIRED: 'Ce champ est requis',
  INVALID_EMAIL: 'Adresse email invalide',
  INVALID_URL: 'URL invalide',
  MIN_LENGTH: 'Trop court',
  MAX_LENGTH: 'Trop long',
  INVALID_FORMAT: 'Format invalide',
  NETWORK_ERROR: 'Erreur de connexion',
  UNKNOWN_ERROR: 'Erreur inconnue'
} as const;

export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_FR: /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/,
  PASSWORD_STRONG: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
} as const;