import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ToastData } from '../../shared/components/toast/toast';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastSubject = new BehaviorSubject<ToastData | null>(null);
  public toast$ = this.toastSubject.asObservable();

  success(message: string, title?: string) {
    this.toastSubject.next({ 
      message, 
      title: title || 'Succès', 
      type: 'success', 
      duration: 4000 
    });
  }

  error(message: string, title?: string) {
    this.toastSubject.next({ 
      message, 
      title: title || 'Erreur', 
      type: 'error', 
      duration: 6000 
    });
  }

  clear() {
    this.toastSubject.next(null);
  }
}