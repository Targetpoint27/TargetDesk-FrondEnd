import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { ComplaintFacade } from '../../../complaints/complaint.facade';
import { Complaint } from '../../../../../domain/models/complaint.model';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-complaint-details',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './complaint-details.component.html',
  styleUrl: './complaint-details.component.scss'
})
export class ComplaintDetailsComponent implements OnInit {
  complaint$!: Observable<Complaint | null>;
  isLoading$!: Observable<boolean>;
  complaintForm!: FormGroup;

  constructor(
    private route: ActivatedRoute,
    private complaintFacade: ComplaintFacade,
    private fb: FormBuilder
  ) {
    this.initForm();
    this.complaint$ = this.complaintFacade.selectedComplaint$;
    this.isLoading$ = this.complaintFacade.isLoading$;
  }

  private initForm() {
    this.complaintForm = this.fb.group({
      root_cause: ['', Validators.required],
      actions_taken: ['', Validators.required],
      proposed_solution: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.complaintFacade.loadById(+id);
      // Patch form when data arrives
      this.complaintFacade.selectedComplaint$.subscribe(complaint => {
        if (complaint) {
          this.complaintForm.patchValue({
            root_cause: complaint.root_cause,
            actions_taken: complaint.actions_taken,
            proposed_solution: complaint.proposed_solution
          });
        }
      });
    }
  }

  onSave() {
    if (this.complaintForm.valid) {
      const id = this.route.snapshot.paramMap.get('id');
      this.complaintFacade.updateInvestigation(+(id!), this.complaintForm.value);
    }
  }
}