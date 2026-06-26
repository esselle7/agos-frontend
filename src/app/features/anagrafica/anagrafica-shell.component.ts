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
      <header class="anagrafica-head">
        <span class="page-eyebrow">Gestione</span>
        <h2>Anagrafica</h2>
      </header>
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
    .anagrafica-head {
      padding: 18px 24px 10px;
      background: linear-gradient(180deg, var(--card-tint), var(--surface));
    }
    .anagrafica-head h2 {
      margin: 0;
      font-size: 1.5rem;
      color: var(--primary-d);
    }
    .anagrafica-tabs {
      border-bottom: 1px solid var(--border);
      padding: 0 24px;
      background: var(--surface);
    }`,
    `
    /* L'eyebrow vive nel template inline: ridefinizione locale (no globale qui). */
    .page-eyebrow {
      display: flex;
      align-items: center;
      gap: 7px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--primary);
      margin-bottom: 3px;
    }
    .page-eyebrow::before {
      content: '';
      width: 18px;
      height: 2px;
      border-radius: 999px;
      background: var(--accent);
    }
  `],
})
export class AnagraficaShellComponent {}
