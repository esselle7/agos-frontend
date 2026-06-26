import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { PianoContiCogeDTO } from '../../../core/models/anagrafica.models';

export interface CogePickerData {
  conti: PianoContiCogeDTO[];
  tipoFilter?: string[];          // restringe ai tipi indicati (es. ['COSTO'])
  allowedIds?: number[];          // restringe agli id ammessi (preserva subset curati dal server)
  selectedId?: number | null;
  title?: string;
  recents?: number[];             // id usati di recente (mostrati come scorciatoie)
}

const TIPO_LABEL: Record<string, string> = {
  RICAVO: 'Ricavi', COSTO: 'Costi', ATTIVITA: 'Attività',
  PASSIVITA: 'Passività', ONERE_FINANZIARIO: 'Oneri finanziari', IMPOSTA: 'Imposte',
};
const TIPO_COLOR: Record<string, string> = {
  RICAVO: '#1F5C43', COSTO: '#B23B2E', ATTIVITA: '#2C6E8F',
  PASSIVITA: '#92400E', ONERE_FINANZIARIO: '#7C3AED', IMPOSTA: '#6B7280',
};

interface Categoria {
  id: number;
  codice: string;
  descrizione: string;
  tipo: string;
  conti: PianoContiCogeDTO[];
}

/**
 * Selettore Conto COGE a due pannelli (categorie | conti). Stessa scelta finale di prima
 * (un conto del piano) ma con navigazione gerarchica + ricerca + recenti: nessuna perdita
 * funzionale, solo UI. Ritorna il {@link PianoContiCogeDTO} scelto (o {@code undefined} se annulla,
 * {@code null} per "rimuovi").
 */
@Component({
  selector: 'app-coge-picker-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatDialogModule, MatIconModule, MatButtonModule],
  template: `
    <div class="cp">
      <header class="cp__head">
        <h2>{{ data.title || 'Scegli il conto' }}</h2>
        <button mat-icon-button (click)="annulla()" aria-label="Chiudi"><mat-icon>close</mat-icon></button>
      </header>

      <div class="cp__search">
        <mat-icon>search</mat-icon>
        <input #q type="text" placeholder="Cerca per nome o codice…"
               [ngModel]="query()" (ngModelChange)="query.set($event)" autocomplete="off" />
        @if (query()) {
          <button mat-icon-button (click)="query.set(''); q.focus()" aria-label="Pulisci"><mat-icon>close</mat-icon></button>
        }
      </div>

      <!-- Recenti -->
      @if (!query() && recentiConti().length) {
        <div class="cp__recents">
          <span class="cp__recents-lbl">Recenti</span>
          @for (c of recentiConti(); track c.id) {
            <button class="cp__chip" type="button"
                    [class.cp__chip--on]="c.id === scelto()?.id"
                    (click)="scegli(c)" [title]="c.codice">
              <span class="cp__chip-dot" [style.background]="color(c.tipo)"></span>{{ c.nome }}
            </button>
          }
        </div>
      }

      <div class="cp__body">
        @if (query()) {
          <!-- Ricerca: lista piatta con percorso -->
          <div class="cp__results">
            @if (!risultati().length) {
              <p class="cp__empty">Nessun conto per «{{ query() }}».</p>
            }
            @for (c of risultati(); track c.id) {
              <button class="cp__leaf" type="button"
                      [class.cp__leaf--on]="c.id === scelto()?.id"
                      (click)="scegli(c)" (dblclick)="conferma()">
                <span class="cp__radio" [class.cp__radio--on]="c.id === scelto()?.id"></span>
                <span class="cp__leaf-main">
                  <span class="cp__leaf-path">{{ pathOf(c) }}</span>
                  <span class="cp__leaf-name">{{ c.nome }}</span>
                </span>
                <span class="cp__code">{{ c.codice }}</span>
              </button>
            }
          </div>
        } @else {
          <!-- Due pannelli: categorie | conti -->
          <div class="cp__panes">
            <div class="cp__cats">
              @for (cat of categorie(); track cat.id) {
                <button class="cp__cat" type="button"
                        [class.cp__cat--on]="cat.id === catSelId()"
                        [title]="cat.descrizione + ' (' + cat.codice + ')'"
                        (click)="catSelId.set(cat.id)">
                  <span class="cp__cat-dot" [style.background]="color(cat.tipo)"></span>
                  <span class="cp__cat-main">
                    <span class="cp__cat-name">{{ cat.descrizione }}</span>
                    <span class="cp__cat-meta">{{ tipoLabel(cat.tipo) }} · {{ cat.codice }}</span>
                  </span>
                  <span class="cp__cat-count">{{ cat.conti.length }}</span>
                </button>
              }
            </div>
            <div class="cp__leaves">
              @if (!catSel()) {
                <p class="cp__empty">Scegli una categoria a sinistra.</p>
              }
              @for (c of catSel()?.conti ?? []; track c.id) {
                <button class="cp__leaf" type="button"
                        [class.cp__leaf--on]="c.id === scelto()?.id"
                        (click)="scegli(c)" (dblclick)="conferma()">
                  <span class="cp__radio" [class.cp__radio--on]="c.id === scelto()?.id"></span>
                  <span class="cp__leaf-name">{{ c.nome }}</span>
                  <span class="cp__code">{{ c.codice }}</span>
                </button>
              }
            </div>
          </div>
        }
      </div>

      <footer class="cp__foot">
        @if (data.selectedId != null) {
          <button mat-button class="cp__remove" (click)="rimuovi()">Rimuovi</button>
        }
        <span class="cp__sel">
          @if (scelto()) { <b>{{ scelto()!.nome }}</b> <span class="cp__code">{{ scelto()!.codice }}</span> }
          @else { Nessun conto selezionato }
        </span>
        <button mat-button (click)="annulla()">Annulla</button>
        <button mat-flat-button color="primary" [disabled]="!scelto()" (click)="conferma()">Conferma</button>
      </footer>
    </div>
  `,
  styles: [`
    /* Altezza DEFINITA (non solo max-height): senza, i pannelli interni con height:100% non hanno
       un'altezza concreta su cui calcolare lo scroll → la lista sinistra cresceva e veniva tagliata. */
    .cp { width: min(760px, 92vw); display: flex; flex-direction: column; height: min(80vh, 560px); }
    .cp__head { display: flex; align-items: center; justify-content: space-between; padding: 4px 4px 4px 8px; }
    .cp__head h2 { margin: 0; font-size: 1.1rem; }
    .cp__search { display: flex; align-items: center; gap: 8px; margin: 4px 10px 10px; padding: 9px 14px;
      border: 1px solid var(--border); border-radius: 14px; background: var(--surface); }
    .cp__search mat-icon { color: var(--text-sub); }
    .cp__search input { flex: 1; border: none; background: transparent; outline: none; font: inherit; color: var(--text-main); }
    .cp__recents { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 0 8px 10px; }
    .cp__recents-lbl { font-size: .72rem; text-transform: uppercase; letter-spacing: .06em; color: var(--text-sub); margin-right: 2px; }
    .cp__chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; border: 1px solid var(--border);
      border-radius: 999px; background: var(--card); cursor: pointer; font: inherit; font-size: .82rem; color: var(--text-main);
      transition: background .14s, border-color .14s; }
    .cp__chip:hover { background: color-mix(in srgb, var(--primary) 7%, transparent); }
    .cp__chip--on { border-color: var(--primary); background: color-mix(in srgb, var(--primary) 12%, transparent); }
    .cp__chip-dot { width: 8px; height: 8px; border-radius: 50%; }
    .cp__body { flex: 1 1 auto; min-height: 0; overflow: hidden; border-top: 1px solid var(--border); }
    /* minmax(0,1fr): le colonne possono restringersi → l'ellissi dei nomi lunghi funziona e il layout non spancia */
    .cp__panes { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr); height: 100%; min-height: 0; }
    /* min-height:0 sui contenitori scrollabili: senza, crescono col contenuto invece di scorrere */
    .cp__cats { overflow-y: auto; min-height: 0; border-right: 1px solid var(--border); padding: 6px; }
    .cp__leaves, .cp__results { overflow-y: auto; min-height: 0; padding: 6px; }
    .cp__results { max-height: 56vh; }
    .cp__cat { display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 10px; border: none;
      background: transparent; border-radius: 12px; cursor: pointer; text-align: left; font: inherit; transition: background .12s; }
    .cp__cat:hover { background: color-mix(in srgb, var(--primary) 6%, transparent); }
    .cp__cat--on { background: color-mix(in srgb, var(--primary) 12%, transparent); }
    .cp__cat-dot { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
    .cp__cat-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .cp__cat-name { font-size: .9rem; font-weight: 600; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .cp__cat-meta { font-size: .72rem; color: var(--text-sub); }
    .cp__cat-count { flex-shrink: 0; font-size: .75rem; font-weight: 700; color: var(--text-sub); background: var(--surface);
      min-width: 22px; height: 20px; padding: 0 6px; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; }
    .cp__leaf { display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 10px; border: none;
      background: transparent; border-radius: 12px; cursor: pointer; text-align: left; font: inherit; transition: background .12s; }
    .cp__leaf:hover { background: color-mix(in srgb, var(--primary) 6%, transparent); }
    .cp__leaf--on { background: color-mix(in srgb, var(--primary) 14%, transparent); }
    .cp__radio { width: 16px; height: 16px; border-radius: 50%; border: 2px solid var(--border); flex-shrink: 0; transition: border-color .12s; }
    .cp__radio--on { border-color: var(--primary); box-shadow: inset 0 0 0 3px var(--primary); }
    .cp__leaf-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .cp__leaf-path { font-size: .68rem; color: var(--text-sub); text-transform: uppercase; letter-spacing: .03em; }
    .cp__leaf-name { flex: 1; font-size: .9rem; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .cp__code { font-family: ui-monospace, 'Courier New', monospace; font-size: .76rem; color: var(--text-sub);
      background: var(--surface); padding: 2px 6px; border-radius: 6px; flex-shrink: 0; }
    .cp__empty { color: var(--text-sub); font-size: .88rem; padding: 24px 12px; text-align: center; }
    .cp__foot { display: flex; align-items: center; gap: 10px; padding: 10px 8px 4px; border-top: 1px solid var(--border); }
    .cp__sel { flex: 1; min-width: 0; font-size: .82rem; color: var(--text-sub); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .cp__sel b { color: var(--text-main); }
    .cp__remove { color: #b23b2e !important; }
    @media (max-width: 560px) { .cp__panes { grid-template-columns: 1fr; } .cp__cats { display: none; } }
  `],
})
export class CogePickerDialogComponent {
  readonly data = inject<CogePickerData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<CogePickerDialogComponent>);

  readonly query = signal('');
  readonly catSelId = signal<number | null>(null);
  readonly scelto = signal<PianoContiCogeDTO | undefined>(undefined);

  /** Conti foglia (senza figli) ammessi dal filtro tipo. */
  private readonly foglie = computed<PianoContiCogeDTO[]>(() => {
    const conti = this.data.conti ?? [];
    const parents = new Set(conti.map(c => c.parentId).filter((x): x is number => x != null));
    const tf = this.data.tipoFilter;
    const allowed = this.data.allowedIds ? new Set(this.data.allowedIds) : null;
    return conti.filter(c =>
      !parents.has(c.id) && (!tf || tf.includes(c.tipo)) && (!allowed || allowed.has(c.id)));
  });

  readonly categorie = computed<Categoria[]>(() => {
    const byId = new Map(this.data.conti.map(c => [c.id, c]));
    const map = new Map<number, Categoria>();
    for (const f of this.foglie()) {
      const parent = f.parentId != null ? byId.get(f.parentId) : undefined;
      const key = parent ? parent.id : -1;
      let cat = map.get(key);
      if (!cat) {
        cat = parent
          ? { id: parent.id, codice: parent.codice, descrizione: parent.nome, tipo: f.tipo, conti: [] }
          : { id: -1, codice: '', descrizione: 'Altri', tipo: f.tipo, conti: [] };
        map.set(key, cat);
      }
      cat.conti.push(f);
    }
    return [...map.values()].sort((a, b) => a.codice.localeCompare(b.codice));
  });

  readonly catSel = computed<Categoria | undefined>(() =>
    this.categorie().find(c => c.id === this.catSelId()));

  readonly risultati = computed<PianoContiCogeDTO[]>(() => {
    const q = this.query().toLowerCase().trim();
    if (!q) return [];
    return this.foglie()
      .filter(c => c.nome.toLowerCase().includes(q) || c.codice.toLowerCase().includes(q))
      .slice(0, 60);
  });

  readonly recentiConti = computed<PianoContiCogeDTO[]>(() => {
    const ids = this.data.recents ?? [];
    const ammessi = new Set(this.foglie().map(c => c.id));
    const byId = new Map(this.foglie().map(c => [c.id, c]));
    return ids.filter(id => ammessi.has(id)).map(id => byId.get(id)!).slice(0, 6);
  });

  constructor() {
    // Preseleziona categoria/conto correnti.
    const sel = this.data.selectedId;
    if (sel != null) {
      const conto = this.foglie().find(c => c.id === sel);
      if (conto) {
        this.scelto.set(conto);
        this.catSelId.set(conto.parentId ?? -1);
      }
    }
    if (this.catSelId() == null && this.categorie().length) {
      this.catSelId.set(this.categorie()[0].id);
    }
  }

  color(tipo: string): string { return TIPO_COLOR[tipo] ?? '#6B7280'; }
  tipoLabel(tipo: string): string { return TIPO_LABEL[tipo] ?? tipo; }

  pathOf(c: PianoContiCogeDTO): string {
    const byId = new Map(this.data.conti.map(x => [x.id, x]));
    const parent = c.parentId != null ? byId.get(c.parentId) : undefined;
    return parent ? `${this.tipoLabel(c.tipo)} › ${parent.nome}` : this.tipoLabel(c.tipo);
  }

  scegli(c: PianoContiCogeDTO): void { this.scelto.set(c); }
  conferma(): void { if (this.scelto()) this.ref.close(this.scelto()); }
  annulla(): void { this.ref.close(undefined); }
  rimuovi(): void { this.ref.close(null); }
}
