import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

/**
 * Placeholder della sezione Export: l'export dati è in ricostruzione. Mostra un banner
 * "in lavorazione" e un pulsante Esporta disabilitato finché la nuova pipeline non sarà pronta.
 */
@Component({
  selector: 'app-export',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, MatProgressBarModule, MatTooltipModule],
  template: `
    <div class="exp">
      <div class="exp-head">
        <span class="page-eyebrow">Strumenti</span>
        <h2>Export</h2>
        <p class="exp-sub">Scarico dei dati del gestionale in CSV ed Excel</p>
      </div>

      <section class="exp-hero" aria-labelledby="exp-title">
        <span class="exp-hero__tape" aria-hidden="true"></span>

        <span class="exp-pill">
          <span class="exp-pill__dot"></span>
          In lavorazione
        </span>

        <mat-icon class="exp-hero__icon" aria-hidden="true">construction</mat-icon>

        <h1 id="exp-title" class="exp-hero__title">Le esportazioni stanno arrivando</h1>
        <p class="exp-hero__lead">
          Stiamo ricostruendo l'export da zero. Presto, da qui, potrai scaricare movimenti,
          il pacchetto per il commercialista e il P&amp;L direttamente in CSV ed Excel.
        </p>

        <mat-progress-bar class="exp-hero__bar" mode="indeterminate" aria-label="Sviluppo in corso" />

        <div class="exp-hero__actions">
          <button mat-flat-button color="primary" disabled
                  matTooltip="Disponibile a breve" aria-disabled="true">
            <mat-icon>download</mat-icon>
            Esporta
          </button>
          <span class="exp-hero__hint">Il pulsante si attiverà al rilascio</span>
        </div>
      </section>

      <div class="exp-coming">
        @for (item of inArrivo; track item.titolo) {
          <div class="exp-card">
            <mat-icon class="exp-card__icon" aria-hidden="true">{{ item.icona }}</mat-icon>
            <div class="exp-card__body">
              <span class="exp-card__title">{{ item.titolo }}</span>
              <span class="exp-card__desc">{{ item.desc }}</span>
            </div>
            <span class="exp-card__tag">Presto</span>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .exp { display: flex; flex-direction: column; gap: 22px; padding: 1.5rem; max-width: 1180px; margin: 0 auto; }
    .exp-head h2 { margin: 4px 0 2px; }
    .exp-sub { margin: 0; color: var(--text-sub); font-size: 0.85rem; }

    /* Hero: l'unico elemento "forte". Nastro diagonale brass come firma "in cantiere". */
    .exp-hero {
      position: relative; overflow: hidden;
      display: flex; flex-direction: column; align-items: center; text-align: center;
      gap: 14px; padding: 48px 28px 36px;
      background:
        radial-gradient(120% 80% at 50% -10%, color-mix(in srgb, var(--primary) 8%, transparent), transparent 70%),
        var(--card);
      border: 1px solid var(--border); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm);
    }
    .exp-hero__tape {
      position: absolute; inset: 0 0 auto 0; height: 6px;
      background: repeating-linear-gradient(
        -45deg,
        color-mix(in srgb, var(--primary) 70%, transparent) 0 10px,
        color-mix(in srgb, var(--primary) 24%, transparent) 10px 20px);
    }

    .exp-pill {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 6px 14px; border-radius: 999px;
      font-size: .74rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
      color: var(--primary);
      background: color-mix(in srgb, var(--primary) 12%, transparent);
      border: 1px solid color-mix(in srgb, var(--primary) 30%, transparent);
    }
    .exp-pill__dot {
      width: 8px; height: 8px; border-radius: 50%; background: var(--primary);
      animation: exp-pulse 1.8s ease-in-out infinite;
    }

    .exp-hero__icon {
      font-size: 56px; width: 56px; height: 56px; color: var(--primary); margin-top: 4px;
    }
    .exp-hero__title { margin: 0; font-size: 1.7rem; font-weight: 700; letter-spacing: -.01em; color: var(--text-main); }
    .exp-hero__lead { margin: 0; max-width: 56ch; line-height: 1.6; color: var(--text-sub); }

    .exp-hero__bar { width: min(320px, 70%); margin: 6px 0 2px; border-radius: 999px; overflow: hidden; }

    .exp-hero__actions { display: flex; flex-direction: column; align-items: center; gap: 6px; margin-top: 4px; }
    .exp-hero__hint { font-size: .76rem; color: var(--text-sub); }

    /* Cosa arriverà: la struttura elenca gli export reali in ritorno. */
    .exp-coming { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
    .exp-card {
      display: flex; align-items: center; gap: 12px; padding: 14px 16px;
      background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-md, 12px);
    }
    .exp-card__icon { color: var(--primary); flex-shrink: 0; }
    .exp-card__body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .exp-card__title { font-weight: 600; color: var(--text-main); font-size: .92rem; }
    .exp-card__desc { font-size: .78rem; color: var(--text-sub); }
    .exp-card__tag {
      flex-shrink: 0; font-size: .68rem; font-weight: 700; letter-spacing: .04em; text-transform: uppercase;
      color: var(--text-sub); background: var(--surface);
      padding: 3px 9px; border-radius: 999px; border: 1px solid var(--border);
    }

    @keyframes exp-pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.5); opacity: .45; }
    }
    @media (prefers-reduced-motion: reduce) {
      .exp-pill__dot { animation: none; }
    }
  `],
})
export class ExportComponent {
  readonly inArrivo = [
    { icona: 'receipt_long',   titolo: 'Movimenti',     desc: 'Elenco per periodo in CSV ed Excel' },
    { icona: 'calculate',      titolo: 'Commercialista', desc: 'Pacchetto mensile: movimenti, categorie, cassa' },
    { icona: 'query_stats',    titolo: 'P&L per Business Unit', desc: 'Conto economico esportabile in Excel' },
  ];
}
