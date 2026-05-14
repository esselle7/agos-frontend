import { Routes } from '@angular/router';

export const eventiRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./eventi.component').then(m => m.EventiComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./evento-detail.component').then(m => m.EventoDetailComponent),
  },
];
