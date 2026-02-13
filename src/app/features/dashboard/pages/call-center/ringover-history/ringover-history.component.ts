import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RingoverService } from '../../../../../core/services/ringover.service';
import { RingoverCall } from '../../../../../core/interfaces/ringover.interface';
import { LoggingService } from '../../../../../core/logging/logging.service';

@Component({
  selector: 'app-ringover-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ringover-history.component.html',
  styleUrls: ['./ringover-history.component.scss']
})
export class RingoverHistoryComponent implements OnInit {
  public calls: RingoverCall[] = [];
  public isLoading = false;

  constructor(
    private ringoverService: RingoverService,
    private loggingService: LoggingService
  ) {}

  ngOnInit(): void {
    this.fetchCallHistory();
  }

  fetchCallHistory(): void {
    this.isLoading = true;
    this.ringoverService.getCallHistory(100).subscribe({
      next: (calls) => {
        this.calls = calls;
        this.isLoading = false;
      },
      error: (err) => {
        this.loggingService.error('Error fetching Ringover data', err);
        this.isLoading = false;
      }
    });
  }

  // Helper to format the phone numbers for display
  formatNumber(num: string): string {
    return num.startsWith('33') ? `+33 ${num.substring(2)}` : `+${num}`;
  }
}