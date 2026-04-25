import { Routes } from '@angular/router';

export const movimentiRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./movimenti.component').then(m => m.MovimentiComponent),
  },
];
