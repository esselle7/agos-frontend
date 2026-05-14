import { Routes } from '@angular/router';

export const movimentiRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./movimenti-list.component').then(m => m.MovimentiListComponent),
  },
  {
    path: 'nuovo',
    loadComponent: () =>
      import('./movimenti-form.component').then(m => m.MovimentiFormComponent),
  },
  {
    path: ':id/modifica',
    loadComponent: () =>
      import('./movimenti-form.component').then(m => m.MovimentiFormComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./movimento-detail.component').then(m => m.MovimentoDetailComponent),
  },
];
