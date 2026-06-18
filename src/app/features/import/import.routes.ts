import { Routes } from '@angular/router';
import { ImportShellComponent } from './import-shell.component';

export const importRoutes: Routes = [
  {
    path: '',
    component: ImportShellComponent,
    children: [
      { path: '', redirectTo: 'bulk', pathMatch: 'full' },
      {
        path: 'bulk',
        loadComponent: () => import('./import-bulk.component').then(m => m.ImportBulkComponent),
      },
      {
        path: 'storico',
        loadComponent: () => import('./import-storico.component').then(m => m.ImportStoricoComponent),
      },
      {
        // Pannello di quadratura di periodo (sostituisce la vista "Incassi POS" a scontrino)
        path: 'quadratura',
        loadComponent: () =>
          import('./quadratura-panel.component').then(m => m.QuadraturaPanelComponent),
      },
      { path: 'smistamento', redirectTo: 'smistamento/catalogare', pathMatch: 'full' },
      {
        // riusa il motore di smistamento (ex dialog) come componente di pagina, una sezione per rotta
        path: 'smistamento/:sezione',
        loadComponent: () =>
          import('../movimenti/import-triage-dialog.component').then(m => m.ImportTriageDialogComponent),
      },
    ],
  },
];
