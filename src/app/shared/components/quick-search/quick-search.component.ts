import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  HostListener,
  signal,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { SearchResult, SearchOptions } from '../../interfaces/search.interface';
import { SearchInstance } from '../../hooks/use-search.hook';
import { SearchService } from '../../services/search.service';

@Component({
  selector: 'app-quick-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="quick-search" [class.focused]="isFocused()" [class.has-results]="searchInstance.hasResults">
      <!-- Input de recherche -->
      <div class="search-input-container">
        <div class="search-input-wrapper">
          <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
            <path d="m21 21-4.35-4.35" stroke="currentColor" stroke-width="2"/>
          </svg>

          <input
            #searchInput
            type="text"
            class="search-input"
            [placeholder]="placeholder"
            [value]="searchInstance.query"
            (input)="onInputChange($event)"
            (focus)="onFocus()"
            (blur)="onBlur()"
            (keydown)="onKeyDown($event)"
            autocomplete="off"
          >

          <!-- Bouton effacer -->
          @if (searchInstance.query.length > 0) {
            <button
              type="button"
              class="clear-button"
              (click)="clearSearch()"
              title="Effacer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2"/>
                <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2"/>
              </svg>
            </button>
          }

          <!-- Indicateur de chargement -->
          @if (searchInstance.loading) {
            <div class="loading-indicator">
              <div class="spinner"></div>
            </div>
          }
        </div>

        <!-- Badge de type -->
        <div class="search-type-badge" [class]="'type-' + type">
          {{ type === 'clients' ? 'Clients' : 'Fournisseurs' }}
        </div>
      </div>

      <!-- Résultats de recherche -->
      @if (showResults()) {
        <div class="search-results" #resultsContainer>
          <!-- Messages d'état -->
          @if (searchInstance.error) {
            <div class="search-message error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" stroke-width="2"/>
                <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" stroke-width="2"/>
              </svg>
              {{ searchInstance.error }}
            </div>
          }

          @if (!searchInstance.loading && !searchInstance.error && searchInstance.query.length >= 2 && !searchInstance.hasResults) {
            <div class="search-message empty">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="2"/>
                <path d="m21 21-4.35-4.35" stroke="currentColor" stroke-width="2"/>
              </svg>
              Aucun résultat pour "{{ searchInstance.query }}"
            </div>
          }

          <!-- Suggestions d'historique -->
          @if (searchInstance.query.length < 2 && showSuggestions && suggestions().length > 0) {
            <div class="suggestions-section">
              <div class="suggestions-header">
                <span>Recherches récentes</span>
                <button
                  type="button"
                  class="clear-history-button"
                  (click)="clearHistory()"
                  title="Effacer l'historique"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <polyline points="3,6 5,6 21,6" stroke="currentColor" stroke-width="2"/>
                    <path d="M19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1,2-2h4a2,2 0 0,1,2,2V6" stroke="currentColor" stroke-width="2"/>
                  </svg>
                </button>
              </div>
              <div class="suggestions-list">
                @for (suggestion of suggestions(); track suggestion) {
                  <button
                    type="button"
                    class="suggestion-item"
                    (click)="selectSuggestion(suggestion)"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2L2 22l10-6 10 6L12 2z" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    {{ suggestion }}
                  </button>
                }
              </div>
            </div>
          }

          <!-- Liste des résultats -->
          @if (searchInstance.hasResults) {
            <div class="results-list" [style.max-height.px]="maxResultsHeight">
              @for (result of searchInstance.results; track result.id; let i = $index) {
                <div
                  class="result-item"
                  [class.highlighted]="i === highlightedIndex()"
                  (click)="selectResult(result)"
                  (mouseenter)="setHighlightedIndex(i)"
                >
                  <!-- Score de pertinence -->
                  <div class="result-score">
                    <div class="score-bar" [style.width.%]="result.match_score * 100"></div>
                    <span class="score-text">{{ (result.match_score * 100) | number:'1.0-0' }}%</span>
                  </div>

                  <!-- Informations principales -->
                  <div class="result-main">
                    <div class="result-name">
                      <span [innerHTML]="searchInstance.highlightTerm(result.name)"></span>
                      @if (result.type === 'entreprise') {
                        <span class="result-type-badge entreprise">E</span>
                      } @else {
                        <span class="result-type-badge particulier">P</span>
                      }
                    </div>

                    <div class="result-details">
                      <span class="result-id">
                        {{ type === 'clients' ? result.client_id : result.supplier_id }}
                      </span>

                      @if (result.email) {
                        <span class="result-email" [innerHTML]="searchInstance.highlightTerm(result.email)"></span>
                      }

                      @if (result.phone) {
                        <span class="result-phone" [innerHTML]="searchInstance.highlightTerm(result.phone)"></span>
                      }
                    </div>

                    <!-- Champ de correspondance -->
                    @if (result.highlighted_field && result.highlighted_field !== 'name') {
                      <div class="result-match-info">
                        <span class="match-label">Trouvé dans:</span>
                        <span class="match-field">{{ getFieldLabel(result.highlighted_field) }}</span>
                      </div>
                    }
                  </div>

                  <!-- Relation type pour fournisseurs -->
                  @if (type === 'suppliers' && result.relation_type) {
                    <div class="result-relation">
                      <span class="relation-badge" [class]="'relation-' + result.relation_type">
                        {{ result.relation_type === 'client_et_fournisseur' ? 'Client & Fournisseur' : 'Fournisseur' }}
                      </span>
                    </div>
                  }
                </div>
              }

              <!-- Afficher plus de résultats -->
              @if (searchInstance.results.length >= maxResults) {
                <div class="show-more">
                  <button
                    type="button"
                    class="show-more-button"
                    (click)="showMoreResults()"
                  >
                    Voir plus de résultats...
                  </button>
                </div>
              }
            </div>
          }

          <!-- Raccourcis clavier -->
          @if (showKeyboardHints && (searchInstance.hasResults || suggestions().length > 0)) {
            <div class="keyboard-hints">
              <span class="hint"><kbd>↑↓</kbd> Naviguer</span>
              <span class="hint"><kbd>Enter</kbd> Sélectionner</span>
              <span class="hint"><kbd>Esc</kbd> Fermer</span>
            </div>
          }
        </div>
      }
    </div>
  `,
  styleUrl: './quick-search.component.scss'
})
export class QuickSearchComponent implements OnInit, OnDestroy {
  @Input() type: 'clients' | 'suppliers' = 'clients';
  @Input() placeholder: string = '';
  @Input() maxResults: number = 10;
  @Input() maxResultsHeight: number = 400;
  @Input() showSuggestions: boolean = true;
  @Input() showKeyboardHints: boolean = true;
  @Input() options: SearchOptions = {};
  @Input() autoFocus: boolean = false;

  @Output() resultSelected = new EventEmitter<SearchResult>();
  @Output() searchChanged = new EventEmitter<string>();
  @Output() focusChanged = new EventEmitter<boolean>();

  @ViewChild('searchInput') searchInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('resultsContainer') resultsContainerRef!: ElementRef<HTMLDivElement>;

  searchInstance!: SearchInstance;

  private destroy$ = new Subject<void>();
  private isFocusedSignal = signal(false);
  private highlightedIndexSignal = signal(-1);
  private suggestionsSignal = signal<string[]>([]);

  // Computed properties
  isFocused = this.isFocusedSignal.asReadonly();
  highlightedIndex = this.highlightedIndexSignal.asReadonly();
  suggestions = this.suggestionsSignal.asReadonly();

  showResults = computed(() =>
    this.isFocused() &&
    (this.searchInstance?.hasResults ||
     this.searchInstance?.hasError ||
     (this.showSuggestions && this.suggestions().length > 0) ||
     (this.searchInstance?.query.length >= 2 && !this.searchInstance?.loading))
  );

  constructor(private searchService: SearchService) {}

  ngOnInit(): void {
    // Initialiser l'instance de recherche
    this.searchInstance = new SearchInstance(this.searchService, this.type);
    this.searchInstance.setOptions(this.options);

    // Initialiser le placeholder
    if (!this.placeholder) {
      this.placeholder = `Rechercher un ${this.type === 'clients' ? 'client' : 'fournisseur'}...`;
    }

    // Charger les suggestions
    this.loadSuggestions();

    // Auto-focus si demandé
    if (this.autoFocus) {
      setTimeout(() => this.focus(), 100);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.searchInstance.clearResults();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    const searchElement = target.closest('.quick-search');

    if (!searchElement) {
      this.onBlur();
    }
  }

  @HostListener('keydown.escape', ['$event'])
  onEscapeKey(event: Event): void {
    event.preventDefault();
    this.onBlur();
    this.searchInputRef?.nativeElement.blur();
  }

  onInputChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const query = target.value;

    this.searchInstance.setQuery(query);
    this.searchChanged.emit(query);
    this.highlightedIndexSignal.set(-1);

    // Recharger les suggestions si la query est vide
    if (query.length === 0) {
      this.loadSuggestions();
    }
  }

  onFocus(): void {
    this.isFocusedSignal.set(true);
    this.focusChanged.emit(true);
    this.loadSuggestions();
  }

  onBlur(): void {
    // Délai pour permettre la sélection d'un résultat
    setTimeout(() => {
      this.isFocusedSignal.set(false);
      this.focusChanged.emit(false);
      this.highlightedIndexSignal.set(-1);
    }, 200);
  }

  onKeyDown(event: KeyboardEvent): void {
    const { key } = event;
    const availableItems = this.getAvailableItems();
    const currentIndex = this.highlightedIndex();

    switch (key) {
      case 'ArrowDown':
        event.preventDefault();
        this.setHighlightedIndex(
          currentIndex < availableItems.length - 1 ? currentIndex + 1 : 0
        );
        this.scrollToHighlighted();
        break;

      case 'ArrowUp':
        event.preventDefault();
        this.setHighlightedIndex(
          currentIndex > 0 ? currentIndex - 1 : availableItems.length - 1
        );
        this.scrollToHighlighted();
        break;

      case 'Enter':
        event.preventDefault();
        if (currentIndex >= 0 && availableItems[currentIndex]) {
          const item = availableItems[currentIndex];
          if (typeof item === 'string') {
            this.selectSuggestion(item);
          } else {
            this.selectResult(item);
          }
        }
        break;

      case 'Tab':
        // Permettre la tabulation normale
        this.onBlur();
        break;
    }
  }

  private getAvailableItems(): (SearchResult | string)[] {
    if (this.searchInstance.hasResults) {
      return this.searchInstance.results;
    } else if (this.showSuggestions && this.suggestions().length > 0) {
      return this.suggestions();
    }
    return [];
  }

  private scrollToHighlighted(): void {
    setTimeout(() => {
      const container = this.resultsContainerRef?.nativeElement;
      if (!container) return;

      const highlighted = container.querySelector('.result-item.highlighted, .suggestion-item.highlighted');
      if (highlighted) {
        highlighted.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    });
  }

  setHighlightedIndex(index: number): void {
    this.highlightedIndexSignal.set(index);
  }

  focus(): void {
    this.searchInputRef?.nativeElement.focus();
  }

  clearSearch(): void {
    this.searchInstance.clearResults();
    this.searchChanged.emit('');
    this.highlightedIndexSignal.set(-1);
    this.loadSuggestions();
    this.focus();
  }

  selectResult(result: SearchResult): void {
    this.resultSelected.emit(result);
    this.onBlur();

    // Optionellement, remplir l'input avec le nom du résultat
    if (this.searchInputRef) {
      this.searchInputRef.nativeElement.value = result.name;
      this.searchInstance.setQuery(result.name);
    }
  }

  selectSuggestion(suggestion: string): void {
    this.searchInstance.setQuery(suggestion);
    this.searchChanged.emit(suggestion);

    if (this.searchInputRef) {
      this.searchInputRef.nativeElement.value = suggestion;
    }

    this.highlightedIndexSignal.set(-1);
    this.focus();
  }

  showMoreResults(): void {
    this.searchInstance.setOptions({ ...this.options, limit: (this.options.limit || 10) + 10 });
    this.searchInstance.searchImmediate(this.searchInstance.query);
  }

  clearHistory(): void {
    this.searchInstance.clearHistory();
    this.suggestionsSignal.set([]);
  }

  private loadSuggestions(): void {
    if (this.showSuggestions) {
      const suggestions = this.searchInstance.getSuggestions();
      this.suggestionsSignal.set(suggestions);
    }
  }

  getFieldLabel(field: string): string {
    const fieldLabels: Record<string, string> = {
      'email': 'Email',
      'phone': 'Téléphone',
      'address': 'Adresse',
      'siret': 'SIRET',
      'client_id': 'ID Client',
      'supplier_id': 'ID Fournisseur',
      'sector': 'Secteur'
    };

    return fieldLabels[field] || field;
  }
}