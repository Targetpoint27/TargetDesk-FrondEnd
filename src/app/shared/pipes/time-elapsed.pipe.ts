import { Pipe, PipeTransform, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { interval, Subscription } from 'rxjs';

@Pipe({
  name: 'timeElapsed',
  standalone: true,
  pure: false
})
export class TimeElapsedPipe implements PipeTransform, OnDestroy {
  private subscription?: Subscription;

  constructor(private cdRef: ChangeDetectorRef) {}

  transform(value: string | Date | undefined): string {
    if (!value) return '00:00';

    if (!this.subscription) {
      this.subscription = interval(1000).subscribe(() => {
        this.cdRef.markForCheck();
      });
    }

    const startTime = new Date(value).getTime();
    const now = new Date().getTime();
    const diffInSeconds = Math.floor((now - startTime) / 1000);

    if (diffInSeconds < 0) return '00:00';

    const minutes = Math.floor(diffInSeconds / 60);
    const seconds = diffInSeconds % 60;

    return `${this.pad(minutes)}:${this.pad(seconds)}`;
  }

  private pad(num: number): string {
    return num < 10 ? `0${num}` : `${num}`;
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}