import { Injectable, signal, computed, effect } from '@angular/core';
import { Subject, BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError, startWith, tap } from 'rxjs/operators';
import { SearchService } from '../services/search.service';
import { SearchResult, UseSearchResult, SearchOptions } from '../interfaces/search.interface';

@Injectable({
  providedIn: 'root'
})
export class UseSearchHook {
  private querySubject = new BehaviorSubject<string>('');
  private typeSubject = new BehaviorSubject<'clients' | 'suppliers'>('clients');
  private optionsSubject = new BehaviorSubject<SearchOptions>({});

  private resultsSignal = signal<SearchResult[]>([]);
  private loadingSignal = signal<boolean>(false);
  private errorSignal = signal<string | null>(null);

  // Computed signals
  readonly results = this.resultsSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  readonly query = computed(() => this.querySubject.value);
  readonly hasResults = computed(() => this.resultsSignal().length > 0);
  readonly hasError = computed(() => this.errorSignal() !== null);

  constructor(private searchService: SearchService) {
    this.initializeSearch();
  }

  private initializeSearch(): void {
    // Combine les observables pour déclencher la recherche
    combineLatest([
      this.querySubject.pipe(debounceTime(300), distinctUntilChanged()),
      this.typeSubject,
      this.optionsSubject
    ]).pipe(
      tap(() => {
        if (this.querySubject.value.length >= 2) {
          this.loadingSignal.set(true);
          this.errorSignal.set(null);
        }
      }),
      switchMap(([query, type, options]) => {
        if (query.length < 2) {
          this.resultsSignal.set([]);
          this.loadingSignal.set(false);
          return [];
        }

        const searchMethod = type === 'clients'
          ? this.searchService.searchClients(query, options)
          : this.searchService.searchSuppliers(query, options);

        return searchMethod.pipe(
          catchError(error => {
            this.errorSignal.set(error.message || 'Erreur de recherche');
            this.loadingSignal.set(false);
            return [];
          })
        );
      })
    ).subscribe(results => {
      this.resultsSignal.set(results);
      this.loadingSignal.set(false);

      // Sauvegarder dans l'historique si des résultats sont trouvés
      if (results.length > 0 && this.querySubject.value.length >= 2) {
        this.searchService.saveSearchToHistory(this.querySubject.value, this.typeSubject.value);
      }
    });
  }

  /**
   * Mettre à jour la requête de recherche
   */
  setQuery(query: string): void {
    this.querySubject.next(query);

    // Effacer immédiatement si moins de 2 caractères
    if (query.length < 2) {
      this.resultsSignal.set([]);
      this.errorSignal.set(null);
      this.loadingSignal.set(false);
    }
  }

  /**
   * Changer le type de recherche (clients/suppliers)
   */
  setType(type: 'clients' | 'suppliers'): void {
    this.typeSubject.next(type);
  }

  /**
   * Mettre à jour les options de recherche
   */
  setOptions(options: SearchOptions): void {
    this.optionsSubject.next({ ...this.optionsSubject.value, ...options });
  }

  /**
   * Recherche immédiate sans debouncing
   */
  searchImmediate(query: string, type?: 'clients' | 'suppliers'): Promise<SearchResult[]> {
    if (type) {
      this.setType(type);
    }

    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    const searchMethod = this.typeSubject.value === 'clients'
      ? this.searchService.searchClients(query, this.optionsSubject.value)
      : this.searchService.searchSuppliers(query, this.optionsSubject.value);

    return new Promise((resolve, reject) => {
      searchMethod.subscribe({
        next: (results) => {
          this.resultsSignal.set(results);
          this.loadingSignal.set(false);
          this.querySubject.next(query);

          if (results.length > 0) {
            this.searchService.saveSearchToHistory(query, this.typeSubject.value);
          }

          resolve(results);
        },
        error: (error) => {
          this.errorSignal.set(error.message || 'Erreur de recherche');
          this.loadingSignal.set(false);
          reject(error);
        }
      });
    });
  }

  /**
   * Mettre en évidence les termes de recherche
   */
  highlightTerm(text: string, term?: string): string {
    const searchTerm = term || this.querySubject.value;
    return this.searchService.highlightSearchTerm(text, searchTerm);
  }

  /**
   * Effacer les résultats et réinitialiser l'état
   */
  clearResults(): void {
    this.resultsSignal.set([]);
    this.errorSignal.set(null);
    this.loadingSignal.set(false);
    this.querySubject.next('');
  }

  /**
   * Effacer seulement l'erreur
   */
  clearError(): void {
    this.errorSignal.set(null);
  }

  /**
   * Obtenir les suggestions basées sur l'historique
   */
  getSuggestions(): string[] {
    return this.searchService.getSearchSuggestions(this.typeSubject.value);
  }

  /**
   * Effacer l'historique des recherches
   */
  clearHistory(): void {
    this.searchService.clearSearchHistory(this.typeSubject.value);
  }

  /**
   * Obtenir des statistiques de recherche
   */
  getStats(): { totalSearches: number; uniqueTerms: number } {
    return this.searchService.getSearchStats();
  }

  /**
   * Hook-like interface pour une utilisation plus simple
   */
  createSearchInstance(initialType: 'clients' | 'suppliers' = 'clients'): UseSearchResult {
    this.setType(initialType);

    return {
      query: this.query(),
      setQuery: (query: string) => this.setQuery(query),
      results: this.results(),
      loading: this.loading(),
      error: this.error(),
      search: (query: string, type?: 'clients' | 'suppliers') => this.searchImmediate(query, type),
      highlightTerm: (text: string, term?: string) => this.highlightTerm(text, term),
      clearResults: () => this.clearResults()
    };
  }
}

/**
 * Factory function pour créer une instance de recherche
 */
export function createSearch(
  searchService: SearchService,
  type: 'clients' | 'suppliers' = 'clients'
): UseSearchHook {
  const hook = new UseSearchHook(searchService);
  hook.setType(type);
  return hook;
}

/**
 * Classe autonome pour la recherche avec état local
 */
export class SearchInstance {
  private hook: UseSearchHook;

  constructor(
    private searchService: SearchService,
    private type: 'clients' | 'suppliers' = 'clients'
  ) {
    this.hook = new UseSearchHook(searchService);
    this.hook.setType(type);
  }

  get query() { return this.hook.query(); }
  get results() { return this.hook.results(); }
  get loading() { return this.hook.loading(); }
  get error() { return this.hook.error(); }
  get hasResults() { return this.hook.hasResults(); }
  get hasError() { return this.hook.hasError(); }

  setQuery(query: string) { this.hook.setQuery(query); }
  setOptions(options: SearchOptions) { this.hook.setOptions(options); }
  searchImmediate(query: string) { return this.hook.searchImmediate(query, this.type); }
  highlightTerm(text: string, term?: string) { return this.hook.highlightTerm(text, term); }
  clearResults() { this.hook.clearResults(); }
  clearError() { this.hook.clearError(); }
  getSuggestions() { return this.hook.getSuggestions(); }
  clearHistory() { this.hook.clearHistory(); }
}

/**
 * Service pour gérer plusieurs instances de recherche
 */
@Injectable({
  providedIn: 'root'
})
export class SearchManager {
  private instances = new Map<string, SearchInstance>();

  constructor(private searchService: SearchService) {}

  /**
   * Obtenir ou créer une instance de recherche
   */
  getInstance(key: string, type: 'clients' | 'suppliers' = 'clients'): SearchInstance {
    if (!this.instances.has(key)) {
      this.instances.set(key, new SearchInstance(this.searchService, type));
    }
    return this.instances.get(key)!;
  }

  /**
   * Supprimer une instance
   */
  removeInstance(key: string): void {
    const instance = this.instances.get(key);
    if (instance) {
      instance.clearResults();
      this.instances.delete(key);
    }
  }

  /**
   * Effacer toutes les instances
   */
  clearAllInstances(): void {
    this.instances.forEach(instance => instance.clearResults());
    this.instances.clear();
  }

  /**
   * Obtenir les statistiques globales
   */
  getGlobalStats(): { totalInstances: number; totalSearches: number; uniqueTerms: number } {
    const searchStats = this.searchService.getSearchStats();
    return {
      totalInstances: this.instances.size,
      ...searchStats
    };
  }
}