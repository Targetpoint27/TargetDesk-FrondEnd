import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { ComplaintFacade } from '../../../complaints/complaint.facade'; 
import { Complaint, ComplaintMetrics } from '../../../../../domain/models/complaint.model';

@Component({
  selector: 'app-complaints-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './complaints-list.component.html',
  styleUrl: './complaints-list.component.scss'
})
export class ComplaintsListComponent implements OnInit {
  complaints$!: Observable<Complaint[]>;
  metrics$!: Observable<ComplaintMetrics | null>;
  isLoading$!: Observable<boolean>;

  constructor(private complaintFacade: ComplaintFacade) {
    this.complaints$ = this.complaintFacade.complaints$;
    this.metrics$ = this.complaintFacade.metrics$;
    this.isLoading$ = this.complaintFacade.isLoading$;
  }

  ngOnInit(): void {
    this.complaintFacade.loadAll();
  }
}