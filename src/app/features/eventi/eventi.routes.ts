import { Routes } from '@angular/router';

export const eventiRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./eventi.component').then(m => m.EventiComponent),
  },
];
