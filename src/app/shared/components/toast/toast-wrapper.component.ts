import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';
import { Toast } from './toast';

@Component({
  selector: 'app-toast-wrapper',
  standalone: true,
  imports: [CommonModule, Toast],
  template: `
    <ui-toast 
      *ngIf="toastService.toast$ | async as data"
      [data]="data"
      position="top-center"
      (dismiss)="toastService.clear()">
    </ui-toast>
  `
})
export class ToastWrapperComponent {
  constructor(public toastService: ToastService) {}
}