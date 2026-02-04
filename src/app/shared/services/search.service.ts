import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable, Subject, BehaviorSubject, timer, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError, shareReplay, tap } from 'rxjs/operators';
import { ApiService } from '../../core/api/api.service';
import {
  SearchResult,
  SearchResponse,
  FilterOptions,
  ClientFilteredResponse,
  SupplierFilteredResponse,
  SearchOptions,
  ClientSearchResult,
  SupplierSearchResult
} from '../interfaces/search.interface';

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly cacheTimeout = 5 * 60 * 1000; // 5 minutes

  // Subjects pour la recherche en temps réel
  private clientSearchSubject = new Subject<string>();
  private supplierSearchSubject = new Subject<string>();

  constructor(private apiService: ApiService) {
    this.initializeSearchStreams();
  }

  private initializeSearchStreams(): void {
    // Stream pour recherche clients avec debouncing
    this.clientSearchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(query => this.performClientSearch(query))
      )
      .subscribe();

    // Stream pour recherche fournisseurs avec debouncing
    this.supplierSearchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(query => this.performSupplierSearch(query))
      )
      .subscribe();
  }

  private getCacheKey(method: string, params: any): string {
    return `${method}_${JSON.stringify(params)}`;
  }

  private isValidCache(timestamp: number): boolean {
    return Date.now() - timestamp < this.cacheTimeout;
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && this.isValidCache(cached.timestamp)) {
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clearCache(): void {
    this.cache.clear();
  }

  private buildHttpParams(params: Record<string, any>): HttpParams {
    let httpParams = new HttpParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.append(key, value.toString());
      }
    });

    return httpParams;
  }

  /**
   * Recherche rapide clients avec autocomplétion
   */
  searchClients(query: string, options: SearchOptions = {}): Observable<SearchResult[]> {
    if (query.length < 2) {
      return of([]);
    }

    const params = {
      q: query,
      limit: options.limit || 10,
      fuzzy: options.fuzzy !== false
    };

    const cacheKey = this.getCacheKey('searchClients', params);
    const cached = this.getFromCache<SearchResult[]>(cacheKey);

    if (cached) {
      return of(cached);
    }

    const httpParams = this.buildHttpParams(params);

    return this.apiService.get<SearchResponse>('/clients/search', { params: httpParams })
      .pipe(
        switchMap(response => {
          if (response.success) {
            const results = response.data.results;
            this.setCache(cacheKey, results);
            return of(results);
          } else {
            throw new Error(response.message);
          }
        }),
        catchError(error => {
          console.error('Erreur lors de la recherche clients:', error);
          return of([]);
        })
      );
  }

  /**
   * Recherche rapide fournisseurs avec autocomplétion
   */
  searchSuppliers(query: string, options: SearchOptions = {}): Observable<SearchResult[]> {
    if (query.length < 2) {
      return of([]);
    }

    const params = {
      q: query,
      limit: options.limit || 10,
      fuzzy: options.fuzzy !== false
    };

    const cacheKey = this.getCacheKey('searchSuppliers', params);
    const cached = this.getFromCache<SearchResult[]>(cacheKey);

    if (cached) {
      return of(cached);
    }

    const httpParams = this.buildHttpParams(params);

    return this.apiService.get<SearchResponse>('/suppliers/search', { params: httpParams })
      .pipe(
        switchMap(response => {
          if (response.success) {
            const results = response.data.results;
            this.setCache(cacheKey, results);
            return of(results);
          } else {
            throw new Error(response.message);
          }
        }),
        catchError(error => {
          console.error('Erreur lors de la recherche fournisseurs:', error);
          return of([]);
        })
      );
  }

  /**
   * Recherche clients avec debouncing automatique
   */
  searchClientsDebounced(query: string): void {
    this.clientSearchSubject.next(query);
  }

  /**
   * Recherche fournisseurs avec debouncing automatique
   */
  searchSuppliersDebounced(query: string): void {
    this.supplierSearchSubject.next(query);
  }

  private performClientSearch(query: string): Observable<SearchResult[]> {
    return this.searchClients(query);
  }

  private performSupplierSearch(query: string): Observable<SearchResult[]> {
    return this.searchSuppliers(query);
  }

  /**
   * Filtrage avancé clients avec pagination et tri
   */
  filterClients(filters: FilterOptions): Observable<ClientFilteredResponse['data']> {
    const cacheKey = this.getCacheKey('filterClients', filters);
    const cached = this.getFromCache<ClientFilteredResponse['data']>(cacheKey);

    if (cached) {
      return of(cached);
    }

    const httpParams = this.buildHttpParams(filters);

    return this.apiService.get<ClientFilteredResponse>('/clients', { params: httpParams })
      .pipe(
        switchMap(response => {
          if (response.success) {
            const data = response.data;
            this.setCache(cacheKey, data);
            return of(data);
          } else {
            throw new Error(response.message);
          }
        }),
        catchError(error => {
          console.error('Erreur lors du filtrage clients:', error);
          throw error;
        })
      );
  }

  /**
   * Filtrage avancé fournisseurs avec pagination et tri
   */
  filterSuppliers(filters: FilterOptions): Observable<SupplierFilteredResponse['data']> {
    const cacheKey = this.getCacheKey('filterSuppliers', filters);
    const cached = this.getFromCache<SupplierFilteredResponse['data']>(cacheKey);

    if (cached) {
      return of(cached);
    }

    const httpParams = this.buildHttpParams(filters);

    return this.apiService.get<SupplierFilteredResponse>('/suppliers', { params: httpParams })
      .pipe(
        switchMap(response => {
          if (response.success) {
            const data = response.data;
            this.setCache(cacheKey, data);
            return of(data);
          } else {
            throw new Error(response.message);
          }
        }),
        catchError(error => {
          console.error('Erreur lors du filtrage fournisseurs:', error);
          throw error;
        })
      );
  }

  /**
   * Utilitaire pour mettre en évidence les termes de recherche
   */
  highlightSearchTerm(text: string, term: string): string {
    if (!term || !text) return text;

    const regex = new RegExp(`(${term})`, 'gi');
    return text.replace(regex, '<mark class="search-highlight">$1</mark>');
  }

  /**
   * Obtenir les suggestions de recherche basées sur l'historique
   */
  getSearchSuggestions(type: 'clients' | 'suppliers' = 'clients'): string[] {
    const storageKey = `search_history_${type}`;
    const history = localStorage.getItem(storageKey);

    if (history) {
      try {
        return JSON.parse(history);
      } catch {
        return [];
      }
    }

    return [];
  }

  /**
   * Sauvegarder une recherche dans l'historique
   */
  saveSearchToHistory(query: string, type: 'clients' | 'suppliers' = 'clients'): void {
    if (query.length < 2) return;

    const storageKey = `search_history_${type}`;
    const maxHistory = 10;

    let history = this.getSearchSuggestions(type);

    // Supprimer si déjà présent
    history = history.filter(item => item.toLowerCase() !== query.toLowerCase());

    // Ajouter en première position
    history.unshift(query);

    // Limiter la taille
    if (history.length > maxHistory) {
      history = history.slice(0, maxHistory);
    }

    localStorage.setItem(storageKey, JSON.stringify(history));
  }

  /**
   * Effacer l'historique des recherches
   */
  clearSearchHistory(type: 'clients' | 'suppliers' = 'clients'): void {
    const storageKey = `search_history_${type}`;
    localStorage.removeItem(storageKey);
  }

  /**
   * Obtenir des statistiques de recherche
   */
  getSearchStats(): { totalSearches: number; uniqueTerms: number } {
    const clientHistory = this.getSearchSuggestions('clients');
    const supplierHistory = this.getSearchSuggestions('suppliers');

    const allTerms = [...clientHistory, ...supplierHistory];
    const uniqueTerms = new Set(allTerms.map(term => term.toLowerCase()));

    return {
      totalSearches: allTerms.length,
      uniqueTerms: uniqueTerms.size
    };
  }

  /**
   * MÉTHODES POUR REMPLACEMENT DE LA LOGIQUE EXISTANTE
   * Intégration avec les facades et composants existants
   */

  /**
   * Remplacer les méthodes des facades clients
   * Utilise les nouveaux endpoints de filtrage avancé au lieu de l'ancien système
   */
  loadClientsWithAdvancedFilters(filters: FilterOptions): Observable<{
    clients: ClientSearchResult[];
    pagination: any;
    total: number;
  }> {
    return this.filterClients(filters).pipe(
      switchMap(data => {
        if (data.clients) {
          return of({
            clients: data.clients,
            pagination: data.pagination,
            total: data.total_without_filters
          });
        } else {
          throw new Error('Réponse invalide du serveur');
        }
      }),
      shareReplay(1)
    );
  }

  /**
   * Remplacer les méthodes des facades fournisseurs
   */
  loadSuppliersWithAdvancedFilters(filters: FilterOptions): Observable<{
    suppliers: SupplierSearchResult[];
    pagination: any;
    total: number;
  }> {
    return this.filterSuppliers(filters).pipe(
      switchMap(data => {
        if (data.suppliers) {
          return of({
            suppliers: data.suppliers,
            pagination: data.pagination,
            total: data.total_without_filters
          });
        } else {
          throw new Error('Réponse invalide du serveur');
        }
      }),
      shareReplay(1)
    );
  }

  /**
   * Conversion des filtres du format actuel vers le nouveau format API
   */
  convertLegacyFiltersToNew(legacyFilters: any): FilterOptions {
    const newFilters: FilterOptions = {};

    // Mapping des anciens filtres vers les nouveaux
    if (legacyFilters.search) {
      newFilters.search = legacyFilters.search;
    }

    if (legacyFilters.type && legacyFilters.type !== 'all') {
      newFilters.type = legacyFilters.type;
    }

    if (legacyFilters.relation_type && legacyFilters.relation_type !== 'all') {
      newFilters.relation_type = legacyFilters.relation_type;
    }

    if (legacyFilters.sector) {
      newFilters.sector = legacyFilters.sector;
    }

    // Pagination
    if (legacyFilters.page) {
      newFilters.page = legacyFilters.page;
    }

    if (legacyFilters.perPage || legacyFilters.per_page) {
      newFilters.per_page = legacyFilters.perPage || legacyFilters.per_page;
    }

    // Tri
    if (legacyFilters.sortBy || legacyFilters.sort_by) {
      newFilters.sort_by = legacyFilters.sortBy || legacyFilters.sort_by;
    }

    if (legacyFilters.sortOrder || legacyFilters.sort_order) {
      newFilters.sort_order = legacyFilters.sortOrder || legacyFilters.sort_order;
    }

    // Dates
    if (legacyFilters.createdFrom || legacyFilters.created_from) {
      newFilters.created_from = legacyFilters.createdFrom || legacyFilters.created_from;
    }

    if (legacyFilters.createdTo || legacyFilters.created_to) {
      newFilters.created_to = legacyFilters.createdTo || legacyFilters.created_to;
    }

    return newFilters;
  }

  /**
   * Méthode unifiée pour le chargement avec filtres (remplace loadClients/loadSuppliers)
   */
  loadEntitiesWithFilters(
    type: 'clients' | 'suppliers',
    filters: any
  ): Observable<{
    entities: (ClientSearchResult | SupplierSearchResult)[];
    pagination: any;
    total: number;
  }> {
    const convertedFilters = this.convertLegacyFiltersToNew(filters);

    if (type === 'clients') {
      return this.loadClientsWithAdvancedFilters(convertedFilters).pipe(
        switchMap(result => of({
          entities: result.clients,
          pagination: result.pagination,
          total: result.total
        }))
      );
    } else {
      return this.loadSuppliersWithAdvancedFilters(convertedFilters).pipe(
        switchMap(result => of({
          entities: result.suppliers,
          pagination: result.pagination,
          total: result.total
        }))
      );
    }
  }

  /**
   * Méthode pour effectuer une recherche complète (recherche rapide + filtrage)
   */
  performCompleteSearch(
    type: 'clients' | 'suppliers',
    query: string,
    additionalFilters?: FilterOptions
  ): Observable<{
    quickResults: SearchResult[];
    filteredResults: {
      entities: (ClientSearchResult | SupplierSearchResult)[];
      pagination: any;
      total: number;
    };
  }> {
    const searchObservable = type === 'clients'
      ? this.searchClients(query)
      : this.searchSuppliers(query);

    const filters: FilterOptions = {
      search: query,
      page: 1,
      per_page: 15,
      sort_by: 'name',
      sort_order: 'asc',
      ...additionalFilters
    };

    const filteredObservable = this.loadEntitiesWithFilters(type, filters);

    return searchObservable.pipe(
      switchMap(quickResults =>
        filteredObservable.pipe(
          switchMap(filteredResults => of({
            quickResults,
            filteredResults
          }))
        )
      )
    );
  }

  /**
   * Observable pour les états de recherche en cours (pour les facades)
   */
  private searchStateSubject = new BehaviorSubject<{
    isLoading: boolean;
    error: string | null;
    lastQuery: string;
    results: any[];
  }>({
    isLoading: false,
    error: null,
    lastQuery: '',
    results: []
  });

  get searchState$() {
    return this.searchStateSubject.asObservable();
  }

  updateSearchState(state: Partial<typeof this.searchStateSubject.value>) {
    this.searchStateSubject.next({
      ...this.searchStateSubject.value,
      ...state
    });
  }

  /**
   * Méthode pour nettoyer l'état de recherche
   */
  resetSearchState() {
    this.searchStateSubject.next({
      isLoading: false,
      error: null,
      lastQuery: '',
      results: []
    });
  }
}