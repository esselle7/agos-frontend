import { Routes } from '@angular/router';
import { AnagraficaShellComponent } from './anagrafica-shell.component';

export const anagraficaRoutes: Routes = [
  {
    path: '',
    component: AnagraficaShellComponent,
    children: [
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
      {
        path: 'personale',
        loadComponent: () =>
          import('./personale/personale-list.component').then(m => m.PersonaleListComponent),
      },
      { path: '', redirectTo: 'fornitori', pathMatch: 'full' },
    ],
  },
];
