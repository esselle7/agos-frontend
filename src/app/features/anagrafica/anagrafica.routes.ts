import { Routes } from '@angular/router';

export const anagraficaRoutes: Routes = [
  {
    path: 'fornitori',
    loadComponent: () =>
      import('./fornitori/fornitori.component').then(m => m.FornitoriComponent),
  },
  {
    path: 'categorie',
    loadComponent: () =>
      import('./categorie/categorie.component').then(m => m.CategorieComponent),
  },
  { path: '', redirectTo: 'fornitori', pathMatch: 'full' },
];
