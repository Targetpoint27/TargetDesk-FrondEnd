import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, switchMap, finalize } from 'rxjs/operators';
import { ClientFacade } from '../../../features/dashboard/clients/client.facade';
import { SearchResult } from '../../interfaces/search.interface';

@Component({
  selector: 'app-link-client-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './link-client-modal.component.html'
})
export class LinkClientModalComponent implements OnInit {
  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<number>();

  searchControl = new FormControl('');
  results: SearchResult[] = [];
  isLoading = false;

  constructor(private clientFacade: ClientFacade) {}

  ngOnInit(): void {
    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        if (!query || query.length < 2) return [];
        this.isLoading = true;
        // Uses the high-speed search logic already built in your facade
        return this.clientFacade.quickSearchClients(query).pipe(
          finalize(() => this.isLoading = false)
        );
      })
    ).subscribe(results => {
      this.results = results;
    });
  }

  onSelectClient(clientId: string | number): void {
    this.confirm.emit(Number(clientId));
  }
}