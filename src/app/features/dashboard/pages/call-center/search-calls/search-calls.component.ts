import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

import { Call } from '../../../../../domain/models/call.model';
import { CallFacade } from '../../../call-center/calls/call.facade';

interface FilterState {
  type?: string;
  status?: string;
  department_id?: number;
  urgency?: string;
  assigned_to?: string;
  period?: string;
  date_from?: string;
  date_to?: string;
}

@Component({
  selector: 'app-search-calls',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './search-calls.component.html',
  styleUrl: './search-calls.component.scss'
})
export class SearchCallsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  searchForm!: FormGroup;
  filterForm!: FormGroup;
  
  calls: Call[] = [];
  filteredCalls: Call[] = [];
  isLoading = false;
  showFilters = true;
  
  totalResults = 0;
  activeFiltersCount = 0;

  // Filter options
  typeOptions = [
    { value: 'entrant', label: 'Entrant' },
    { value: 'sortant', label: 'Sortant' }
  ];

  statusOptions = [
    { value: 'nouveau', label: 'Nouveau' },
    { value: 'a_traiter', label: 'À traiter' },
    { value: 'en_cours', label: 'En cours' },
    { value: 'en_attente', label: 'En attente' },
    { value: 'resolu', label: 'Résolu' },
    { value: 'cloture', label: 'Clôturé' },
    { value: 'a_rappeler', label: 'À rappeler' }
  ];

  urgencyOptions = [
    { value: 'normal', label: 'Normal' },
    { value: 'urgent', label: 'Urgent' },
    { value: 'critique', label: 'Critique' }
  ];

  periodOptions = [
    { value: 'today', label: 'Aujourd\'hui' },
    { value: 'week', label: 'Cette semaine' },
    { value: 'month', label: 'Ce mois' },
    { value: 'custom', label: 'Personnalisé' }
  ];

  assignmentOptions = [
    { value: 'me', label: 'Mes appels' },
    { value: 'unassigned', label: 'Non assignés' },
    { value: 'all', label: 'Tous' }
  ];

  // Departments - you can fetch this from an API
  departments: any[] = [];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private callFacade: CallFacade
  ) {
    this.initForms();
  }

  ngOnInit(): void {
    this.setupSearchListener();
    this.loadAllCalls();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initForms(): void {
    // Search form
    this.searchForm = this.fb.group({
      query: ['']
    });

    // Filter form
    this.filterForm = this.fb.group({
      type: [''],
      status: [''],
      department_id: [''],
      urgency: [''],
      assigned_to: [''],
      period: [''],
      date_from: [''],
      date_to: ['']
    });
  }

  setupSearchListener(): void {
    this.searchForm.get('query')?.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(query => {
        if (query && query.trim().length > 0) {
          this.performSearch(query);
        } else {
          this.applyFilters();
        }
      });
  }

  loadAllCalls(): void {
    this.isLoading = true;
    
    // Call the filter endpoint with no filters to get all calls
    this.callFacade.filterCalls({}).subscribe({
      next: (response: any) => {
        this.calls = response.calls || [];
        this.filteredCalls = [...this.calls];
        this.totalResults = response.total || 0;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  performSearch(query: string): void {
    this.isLoading = true;
    
    this.callFacade.searchCalls(query).subscribe({
      next: (results: Call[]) => {
        this.filteredCalls = results;
        this.totalResults = results.length;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    const filters = this.buildFilterObject();
    this.countActiveFilters(filters);
    
    if (Object.keys(filters).length === 0) {
      this.filteredCalls = [...this.calls];
      this.totalResults = this.calls.length;
      return;
    }

    this.isLoading = true;
    
    this.callFacade.filterCalls(filters).subscribe({
      next: (response: any) => {
        this.filteredCalls = response.calls || [];
        this.totalResults = response.total || 0;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  buildFilterObject(): FilterState {
    const formValue = this.filterForm.value;
    const filters: FilterState = {};

    if (formValue.type) filters.type = formValue.type;
    if (formValue.status) filters.status = formValue.status;
    if (formValue.department_id) filters.department_id = formValue.department_id;
    if (formValue.urgency) filters.urgency = formValue.urgency;
    if (formValue.assigned_to && formValue.assigned_to !== 'all') {
      filters.assigned_to = formValue.assigned_to;
    }
    if (formValue.period) {
      filters.period = formValue.period;
      if (formValue.period === 'custom') {
        if (formValue.date_from) filters.date_from = formValue.date_from;
        if (formValue.date_to) filters.date_to = formValue.date_to;
      }
    }

    return filters;
  }

  countActiveFilters(filters: FilterState): void {
    this.activeFiltersCount = Object.keys(filters).filter(
      key => key !== 'date_from' && key !== 'date_to'
    ).length;
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.searchForm.reset();
    this.activeFiltersCount = 0;
    this.loadAllCalls();
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  viewCall(callId: number): void {
    this.router.navigate(['/dashboard/call-center/calls', callId]);
  }

  getStatusClass(status: string): string {
    const classes: any = {
      'nouveau': 'bg-green-100 text-green-800',
      'a_traiter': 'bg-yellow-100 text-yellow-800',
      'en_cours': 'bg-blue-100 text-blue-800',
      'en_attente': 'bg-orange-100 text-orange-800',
      'resolu': 'bg-purple-100 text-purple-800',
      'cloture': 'bg-gray-100 text-gray-800',
      'a_rappeler': 'bg-red-100 text-red-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  }

  getUrgencyClass(urgency: string): string {
    const classes: any = {
      'critique': 'bg-red-100 text-red-800',
      'urgent': 'bg-orange-100 text-orange-800',
      'normal': 'bg-blue-100 text-blue-800'
    };
    return classes[urgency] || 'bg-blue-100 text-blue-800';
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  exportToCSV(): void {
    // TODO: Implement CSV export
    console.log('Export to CSV');
  }
}