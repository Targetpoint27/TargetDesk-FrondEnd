import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-8">
      <h1 class="text-2xl font-bold mb-4">Détails de la tâche</h1>
      <p class="text-gray-600">Cette page sera développée prochainement.</p>
    </div>
  `
})
export class TaskDetailComponent {}