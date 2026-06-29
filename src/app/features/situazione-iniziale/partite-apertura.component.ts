import { ChangeDetectionStrategy, Component, Input, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MovimentiService } from '../../core/services/movimenti.service';
import { MovimentoDTOShared } from '../../core/models/shared.models';
import { PianoContiCogeDTO } from '../../core/models/anagrafica.models';
import { CogePickerComponent } from '../../shared/components/coge-picker/coge-picker.component';

const DATA_APERTURA = '2025-12-31';

interface PartitaForm {
  descrizione: string;
  importo: number | null;
  scadenza: string;
  contoCoge: number | null;
}

/**
 * Crediti da incassare (ENTRATA) o debiti da pagare (USCITA) aperti al 31/12/2025.
 * Sono movimenti DA_LIQUIDARE con competenza economica 2025: NON entrano nel P&L 2026 (competenza
 * pregressa) ma quando li incassi/paghi nel 2026 muovono la cassa e si liquidano normalmente.
 */
@Component({
  selector: 'app-partite-apertura',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, MatIconModule, MatProgressSpinnerModule, CogePickerComponent],
  template: `
    <p class="intro">{{ intro }}</p>

    @if (loading()) {
      <div class="center"><mat-spinner diameter="28"></mat-spinner></div>
    } @else {
      @if (righe().length) {
        <ul class="list">
          @for (m of righe(); track m.id) {
            <li class="row" [class.row--busy]="busyId() === m.id">
              <div class="amount" [class.is-in]="entrata" [class.is-out]="!entrata">{{ eur(m.importo) }}</div>
              <div class="meta">
                <p class="desc">{{ m.descrizione || 'Senza descrizione' }} <span class="tag-2025">Apertura 2025</span></p>
                <span class="sub">{{ controparteLabel }} · scadenza {{ data(m.dataLiquidita) }}</span>
              </div>
              <button class="ico ico--danger" [disabled]="busyId() === m.id" (click)="elimina(m)" title="Rimuovi"><mat-icon>delete</mat-icon></button>
            </li>
          }
        </ul>
        <div class="foot"><span>Totale {{ totaleLabel }}</span><strong>{{ eur(totale()) }}</strong></div>
      } @else {
        <div class="empty"><mat-icon>{{ entrata ? 'call_received' : 'call_made' }}</mat-icon><p>Niente da inserire.</p><span>{{ emptyHint }}</span></div>
      }

      @if (!form()) {
        <button class="btn-add" (click)="apri()"><mat-icon>add</mat-icon> {{ addLabel }}</button>
      } @else {
        <div class="cform">
          <div class="cform__grid">
            <label class="field field--wide"><span>{{ controparteLabel }} e causale</span>
              <input type="text" [ngModel]="form()!.descrizione" (ngModelChange)="patch('descrizione', $event)" [placeholder]="placeholder" /></label>
            <label class="field"><span>Importo</span>
              <div class="money"><input type="number" step="0.01" [ngModel]="form()!.importo" (ngModelChange)="patch('importo', $event)" /><i>€</i></div></label>
            <label class="field"><span>Scadenza prevista</span>
              <input type="date" [ngModel]="form()!.scadenza" (ngModelChange)="patch('scadenza', $event)" /></label>
            <div class="field field--wide">
              <app-coge-picker [tipoFilter]="cogeTipo" [value]="form()!.contoCoge" [required]="true"
                               [label]="entrata ? 'Categoria ricavo' : 'Categoria costo'"
                               (cogeChange)="patch('contoCoge', $event?.id ?? null)" />
            </div>
          </div>
          <div class="cform__actions">
            <button class="btn-ghost" (click)="form.set(null)">Annulla</button>
            <button class="btn-primary" [disabled]="!valido() || saving()" (click)="salva()">
              @if (saving()) { <mat-spinner diameter="14"></mat-spinner> } @else { Aggiungi }
            </button>
          </div>
        </div>
      }
    }
  `,
  styleUrls: ['./partite-apertura.component.scss'],
})
export class PartiteAperturaComponent implements OnInit {
  @Input({ required: true }) tipo!: 'ENTRATA' | 'USCITA';

  private readonly svc = inject(MovimentiService);
  private readonly snack = inject(MatSnackBar);

  readonly righe = signal<MovimentoDTOShared[]>([]);
  readonly loading = signal(true);
  readonly busyId = signal<string | null>(null);
  readonly form = signal<PartitaForm | null>(null);
  readonly saving = signal(false);
  readonly totale = computed(() => this.righe().reduce((s, m) => s + (m.importo ?? 0), 0));

  get entrata(): boolean { return this.tipo === 'ENTRATA'; }
  get cogeTipo(): string[] { return [this.entrata ? 'RICAVO' : 'COSTO']; }
  get controparteLabel(): string { return this.entrata ? 'Cliente' : 'Fornitore'; }
  get totaleLabel(): string { return this.entrata ? 'crediti da incassare' : 'debiti da pagare'; }
  get addLabel(): string { return this.entrata ? 'Aggiungi credito' : 'Aggiungi debito'; }
  get intro(): string {
    return this.entrata
      ? 'Soldi che i clienti ti devono al 31/12/2025 (eventi o fatture non ancora incassati). Quando li incassi nel 2026 muovono la cassa, ma non contano come ricavo 2026.'
      : 'Fatture fornitori da pagare al 31/12/2025 (es. un saldo fornitore aperto). Quando le paghi nel 2026 escono dalla cassa, ma non contano come costo 2026.';
  }
  get emptyHint(): string {
    return this.entrata ? 'Aggiungi i crediti aperti che ti ha indicato la commercialista.'
                        : 'Aggiungi i debiti verso fornitori aperti a fine 2025.';
  }
  get placeholder(): string {
    return this.entrata ? 'Es. Evento Rossi – saldo da incassare' : 'Es. Fornitore X – fatture da saldare';
  }

  ngOnInit(): void { this.carica(); }

  private carica(): void {
    this.loading.set(true);
    this.svc.getPartiteApertura(this.tipo).subscribe({
      next: l => { this.righe.set(l); this.loading.set(false); },
      error: () => { this.loading.set(false); this.snack.open('Errore nel caricamento.', 'OK', { duration: 4000 }); },
    });
  }

  apri(): void {
    this.form.set({ descrizione: '', importo: null, scadenza: '2026-03-31', contoCoge: null });
  }
  patch<K extends keyof PartitaForm>(k: K, v: PartitaForm[K]): void {
    this.form.update(f => f ? { ...f, [k]: v } : f);
  }
  valido(): boolean {
    const f = this.form();
    return !!(f && f.descrizione.trim() && f.importo && f.importo > 0 && f.scadenza && f.contoCoge);
  }

  salva(): void {
    const f = this.form();
    if (!f || !this.valido()) return;
    this.saving.set(true);
    this.svc.create({
      tipo: this.tipo, importo: f.importo!, importoLordo: f.importo!, aliquotaIva: null,
      dataMovimento: DATA_APERTURA, dataCompetenza: DATA_APERTURA, dataFinanziaria: null,
      dataLiquidita: f.scadenza, contoBancarioId: null, metodoPagamentoId: null,
      businessUnitId: this.entrata ? 2 : 1, contoCoge: f.contoCoge!, categoriaId: null,
      fornitoreId: null, eventoId: null, tipoEventoMovimento: null,
      descrizione: f.descrizione.trim(), note: null, riferimentoEsterno: null, fonte: 'APERTURA', allegatoPath: null,
    }).subscribe({
      next: () => { this.saving.set(false); this.form.set(null); this.snack.open('Aggiunto', undefined, { duration: 1800 }); this.carica(); },
      error: () => { this.saving.set(false); this.snack.open('Salvataggio non riuscito.', 'OK', { duration: 4000 }); },
    });
  }

  elimina(m: MovimentoDTOShared): void {
    this.busyId.set(m.id);
    this.svc.delete(m.id).subscribe({
      next: () => { this.righe.update(l => l.filter(x => x.id !== m.id)); this.busyId.set(null); },
      error: () => { this.busyId.set(null); this.snack.open('Rimozione non riuscita.', 'OK', { duration: 4000 }); },
    });
  }

  eur(v: number): string { return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(v ?? 0); }
  data(iso: string | null): string { return iso ? new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso)) : '—'; }
}
