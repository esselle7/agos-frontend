import { Component, OnInit, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { PianoContiService } from '../../core/services/piano-conti.service';
import { PianoContiCogeDTO, TipoCoge } from '../../core/models/anagrafica.models';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import {
  PianoContiFormDialogComponent,
  PianoContiFormData,
} from './piano-conti-form-dialog.component';

// Ordine e label dei gruppi (titolo di sezione al plurale).
const GRUPPI: { tipo: TipoCoge; label: string }[] = [
  { tipo: 'RICAVO',            label: 'Ricavi' },
  { tipo: 'COSTO',             label: 'Costi' },
  { tipo: 'ATTIVITA',          label: 'Attività' },
  { tipo: 'PASSIVITA',         label: 'Passività' },
  { tipo: 'ONERE_FINANZIARIO', label: 'Oneri finanziari' },
  { tipo: 'IMPOSTA',           label: 'Imposte' },
];

interface Gruppo { tipo: TipoCoge; label: string; conti: PianoContiCogeDTO[]; }

@Component({
  selector: 'app-piano-conti',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    SkeletonLoaderComponent,
  ],
  template: `
    <div class="pc">
      <div class="pc-header">
        <div>
          <span class="page-eyebrow">Gestione</span>
          <h2>Piano dei conti</h2>
          <p class="pc-subtitle">I conti COGE usati in tutta la contabilità, raggruppati per natura</p>
        </div>
        <button mat-flat-button color="primary" (click)="apri()">
          <mat-icon>add</mat-icon>
          Nuovo conto
        </button>
      </div>

      <mat-form-field appearance="outline" class="pc-search">
        <mat-icon matPrefix>search</mat-icon>
        <mat-label>Cerca per codice o descrizione</mat-label>
        <input matInput [value]="filtro()" (input)="filtro.set($any($event.target).value)" />
        @if (filtro()) {
          <button matSuffix mat-icon-button aria-label="Pulisci" (click)="filtro.set('')">
            <mat-icon>close</mat-icon>
          </button>
        }
      </mat-form-field>

      @if (loading()) {
        <div class="card"><agos-skeleton-loader [rows]="8" /></div>
      } @else if (error()) {
        <div class="card pc-error"><mat-icon>error_outline</mat-icon> {{ error() }}</div>
      } @else if (gruppi().length === 0) {
        <div class="card pc-empty">
          <mat-icon>search_off</mat-icon>
          <p>Nessun conto trovato{{ filtro() ? ' per «' + filtro() + '»' : '' }}</p>
        </div>
      } @else {
        @for (g of gruppi(); track g.tipo) {
          <section class="pc-group" [class]="'pc-group--' + g.tipo">
            <div class="pc-group__head">
              <span class="pc-group__dot"></span>
              <h3 class="pc-group__title">{{ g.label }}</h3>
              <span class="pc-group__count">{{ g.conti.length }}</span>
              <button mat-stroked-button class="pc-group__add" (click)="apri(undefined, g.tipo)">
                <mat-icon>add</mat-icon> Aggiungi
              </button>
            </div>

            <div class="pc-grid">
              @for (c of g.conti; track c.id) {
                <button type="button" class="pc-card" (click)="apri(c)"
                        [attr.aria-label]="'Modifica conto ' + c.codice + ' ' + c.nome">
                  <span class="pc-card__stripe"></span>
                  <span class="pc-card__main">
                    <span class="pc-card__codice">{{ c.codice }}</span>
                    <span class="pc-card__nome">{{ c.nome }}</span>
                  </span>
                  <mat-icon class="pc-card__edit" aria-hidden="true">edit</mat-icon>
                </button>
              }
            </div>
          </section>
        }
      }
    </div>
  `,
  styles: [`
    .pc { display: flex; flex-direction: column; gap: 18px; padding: 1.5rem; max-width: 1180px; margin: 0 auto; }
    .pc-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
    .pc-header h2 { margin: 4px 0 2px; }
    .pc-subtitle { margin: 0; color: var(--text-sub); font-size: 0.85rem; }
    .pc-search { width: 100%; max-width: 440px; }

    /* Ogni gruppo porta il colore della sua natura in --accent; le card lo ereditano. */
    .pc-group { display: flex; flex-direction: column; gap: 12px; }
    .pc-group--RICAVO            { --accent: var(--success); }
    .pc-group--COSTO             { --accent: var(--danger); }
    .pc-group--ATTIVITA          { --accent: var(--info); }
    .pc-group--PASSIVITA         { --accent: var(--warning); }
    .pc-group--ONERE_FINANZIARIO { --accent: var(--primary); }
    .pc-group--IMPOSTA           { --accent: var(--text-sub); }

    .pc-group__head { display: flex; align-items: center; gap: 10px; }
    .pc-group__dot { width: 12px; height: 12px; border-radius: 4px; background: var(--accent); flex-shrink: 0; }
    .pc-group__title { margin: 0; font-size: 1rem; font-weight: 700; color: var(--text-main); letter-spacing: .01em; }
    .pc-group__count {
      font-size: .72rem; font-weight: 700; color: var(--accent);
      background: color-mix(in srgb, var(--accent) 14%, transparent);
      min-width: 22px; height: 20px; padding: 0 7px; border-radius: 999px;
      display: inline-flex; align-items: center; justify-content: center;
    }
    .pc-group__add { margin-left: auto; }
    .pc-group__add mat-icon { margin-right: 2px; }

    .pc-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }

    /* Card type-coded: tinta tenue del colore + filetto laterale; la matita è l'affordance di modifica. */
    .pc-card {
      display: flex; align-items: stretch; gap: 12px; width: 100%; text-align: left;
      padding: 12px 14px 12px 0; cursor: pointer; font: inherit;
      background: color-mix(in srgb, var(--accent) 5%, var(--card));
      border: 1px solid var(--border); border-radius: 16px; overflow: hidden;
      transition: border-color .15s ease, box-shadow .15s ease, transform .15s ease;
    }
    .pc-card__stripe { width: 5px; align-self: stretch; background: var(--accent); border-radius: 0 4px 4px 0; flex-shrink: 0; }
    .pc-card__main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; padding: 2px 0; }
    .pc-card__codice {
      align-self: flex-start; font-family: ui-monospace, 'Courier New', monospace; font-size: .76rem; font-weight: 700;
      color: var(--accent); background: color-mix(in srgb, var(--accent) 13%, transparent);
      padding: 2px 8px; border-radius: 7px; font-variant-numeric: tabular-nums;
    }
    .pc-card__nome { font-size: .92rem; font-weight: 600; color: var(--text-main); line-height: 1.3; }
    .pc-card__edit { color: var(--text-sub); align-self: center; opacity: .55; transition: opacity .15s ease, color .15s ease; }

    .pc-card:hover { border-color: color-mix(in srgb, var(--accent) 50%, var(--border)); box-shadow: var(--shadow-sm); transform: translateY(-1px); }
    .pc-card:hover .pc-card__edit { opacity: 1; color: var(--accent); }
    .pc-card:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

    .pc-error { display: flex; align-items: center; gap: 10px; padding: 18px; color: var(--danger); }
    .pc-empty { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 36px; color: var(--text-sub); }

    @media (prefers-reduced-motion: reduce) {
      .pc-card { transition: none; }
      .pc-card:hover { transform: none; }
    }
  `],
})
export class PianoContiComponent implements OnInit {
  private readonly service = inject(PianoContiService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  readonly conti = signal<PianoContiCogeDTO[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly filtro = signal('');

  readonly filtrati = computed(() => {
    const q = this.filtro().trim().toLowerCase();
    const list = this.conti();
    if (!q) return list;
    return list.filter(c => c.codice.toLowerCase().includes(q) || c.nome.toLowerCase().includes(q));
  });

  readonly gruppi = computed<Gruppo[]>(() => {
    const list = this.filtrati();
    return GRUPPI
      .map(g => ({ tipo: g.tipo, label: g.label, conti: list.filter(c => c.tipo === g.tipo) }))
      .filter(g => g.conti.length > 0);
  });

  ngOnInit(): void {
    this.carica();
  }

  carica(): void {
    this.loading.set(true);
    this.error.set(null);
    this.service.list().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => { this.conti.set(data); this.loading.set(false); },
      error: () => { this.error.set('Errore nel caricamento del piano dei conti.'); this.loading.set(false); },
    });
  }

  apri(conto?: PianoContiCogeDTO, presetTipo?: TipoCoge): void {
    const data: PianoContiFormData = { conto, presetTipo, conti: this.conti() };
    this.dialog
      .open(PianoContiFormDialogComponent, {
        data, width: '460px', panelClass: 'pc-dialog-panel', autoFocus: 'first-tabbable',
      })
      .afterClosed()
      .subscribe((salvato) => { if (salvato) this.carica(); });
  }
}
