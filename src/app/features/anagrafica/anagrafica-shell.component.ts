import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';

@Component({
  selector: 'app-anagrafica-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatTabsModule],
  template: `
    <div class="anagrafica-shell">
      <nav mat-tab-nav-bar [tabPanel]="tabPanel" class="anagrafica-tabs">
        <a mat-tab-link routerLink="fornitori" routerLinkActive #rl1="routerLinkActive" [active]="rl1.isActive">
          Fornitori
        </a>
        <a mat-tab-link routerLink="categorie" routerLinkActive #rl2="routerLinkActive" [active]="rl2.isActive">
          Categorie
        </a>
        <a mat-tab-link routerLink="personale" routerLinkActive #rl3="routerLinkActive" [active]="rl3.isActive">
          Personale
        </a>
      </nav>
      <mat-tab-nav-panel #tabPanel>
        <router-outlet />
      </mat-tab-nav-panel>
    </div>
  `,
  styles: [`
    .anagrafica-shell {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    .anagrafica-tabs {
      border-bottom: 1px solid var(--border);
      padding: 0 24px;
      background: var(--surface);
    }
  `],
})
export class AnagraficaShellComponent {}
