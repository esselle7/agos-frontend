import { Routes } from '@angular/router';

export const anagraficaRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./anagrafica.component').then(m => m.AnagraficaComponent),
  },
];
