import { Routes } from '@angular/router';

export const speseRicorrentiRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./spese-ricorrenti-list.component').then(m => m.SpeseRicorrentiListComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./spese-ricorrenti-detail.component').then(m => m.SpeseRicorrentiDetailComponent),
  },
];
