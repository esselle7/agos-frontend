import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MovimentiService } from '../../core/services/movimenti.service';
import { KeywordFirmaDTO } from '../../core/models/movimenti.models';
import { PianoContiCogeDTO, BusinessUnitDTO, FornitoreSummaryDTO } from '../../core/models/anagrafica.models';
import { CogePickerComponent } from '../../shared/components/coge-picker/coge-picker.component';
import { KeywordKind, keywordVisual, tipoMovLabel } from './keyword-visual';

interface WizardData {
  coge: PianoContiCogeDTO[];
  bu: BusinessUnitDTO[];
  fornitori: FornitoreSummaryDTO[];
}

interface KindOption {
  kind: KeywordKind;
  icon: string;
  titolo: string;
  esempi: string;
  spiega: string;
  accent: string;
}

/**
 * Wizard guidato di creazione keyword (PROMPT-KEYWORD-LEARNING.md §4.8): l'utente sceglie il
 * TIPO con esempi concreti, inserisce i token, definisce il target e vede in chiaro "cosa
 * succederà" prima di salvare. Nasconde la complessità natura/azione dietro 3 scelte parlanti.
 */
@Component({
  selector: 'app-keyword-create-wizard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule, MatDialogModule, MatStepperModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatProgressSpinnerModule, MatTooltipModule,
    CogePickerComponent,
  ],
  templateUrl: './keyword-create-wizard.component.html',
  styleUrls: ['./keyword-create-wizard.component.scss'],
})
export class KeywordCreateWizardComponent {
  readonly data = inject<WizardData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<KeywordCreateWizardComponent, boolean>);
  private readonly movimentiService = inject(MovimentiService);
  private readonly snackBar = inject(MatSnackBar);

  readonly opzioni: KindOption[] = [
    {
      kind: 'IDENTITA', icon: 'badge', titolo: 'Un fornitore / cliente preciso',
      esempi: 'es. SELECOVER, TIM, un codice mandato SDD',
      spiega: 'Riconosce una controparte dal nome o dal codice e registra il movimento attribuendole il fornitore.',
      accent: 'kw-identita',
    },
    {
      kind: 'DOMINIO_CATEGORIA', icon: 'sell', titolo: 'Una categoria di ricavo / costo',
      esempi: 'es. PRANZO, SPACCIO, ORTOFRUTTA, ASSICURAZIONE',
      spiega: 'Riconosce un concetto e registra il movimento su una categoria (BU + COGE). Non attribuisce un fornitore.',
      accent: 'kw-categoria',
    },
    {
      kind: 'DOMINIO_EVENTO', icon: 'celebration', titolo: 'Un evento da riconciliare',
      esempi: 'es. MATRIMONIO, CERIMONIA, BATTESIMO',
      spiega: 'Riconosce un evento e lo mette in attesa di riconciliazione: NON crea un movimento contabile.',
      accent: 'kw-evento',
    },
  ];

  kind = signal<KeywordKind | null>(null);
  tokens = signal<string[]>([]);
  tokenInput = '';

  buId: number | null = null;
  cogeCodice: string | null = null;
  fornitoreId: string | null = null;
  eventoForza = 'FORTE';
  tipoMovimento = '*';
  sorgente = '*';
  note: string | null = null;

  saving = signal(false);

  readonly visual = computed(() => {
    const k = this.kind();
    return k ? this.opzioni.find(o => o.kind === k)! : null;
  });

  readonly isEvento = computed(() => this.kind() === 'DOMINIO_EVENTO');
  readonly isIdentita = computed(() => this.kind() === 'IDENTITA');

  readonly tokenValido = computed(() => this.tokens().length >= 1);
  readonly targetValido = computed(() => {
    if (this.isEvento()) return true;
    return this.buId != null && !!this.cogeCodice;
  });

  /** Frase in italiano: cosa farà concretamente questa keyword. */
  readonly cosaSuccede = computed(() => {
    const k = this.kind();
    if (!k || this.tokens().length === 0) return '';
    const tk = this.tokens().join(' + ');
    const quando = `Quando una riga ${tipoMovLabel(this.tipoMovimento)} contiene «${tk}»`;
    if (k === 'DOMINIO_EVENTO') {
      return `${quando} → la tratto come evento e la metto in attesa di riconciliazione. Non viene creato alcun movimento.`;
    }
    const cogeTxt = this.cogeNome(this.cogeCodice);
    const buTxt = this.buNome(this.buId);
    if (k === 'IDENTITA') {
      const forn = this.fornitoreId ? `, attribuendo il fornitore ${this.fornitoreNome(this.fornitoreId)}` : '';
      return `${quando} → la registro su ${cogeTxt} (${buTxt})${forn}.`;
    }
    return `${quando} → la registro su ${cogeTxt} (${buTxt}), senza fornitore.`;
  });

  scegliKind(k: KeywordKind): void {
    this.kind.set(k);
    if (k === 'DOMINIO_EVENTO' && this.tipoMovimento === '*') this.tipoMovimento = 'ENTRATA';
  }

  aggiungiToken(): void {
    const v = this.tokenInput.trim().toUpperCase();
    if (v && !this.tokens().includes(v)) this.tokens.update(t => [...t, v]);
    this.tokenInput = '';
  }

  rimuoviToken(t: string): void {
    this.tokens.update(ts => ts.filter(x => x !== t));
  }

  buNome(id: number | null): string {
    return id == null ? '—' : (this.data.bu.find(b => b.id === id)?.nome ?? `BU${id}`);
  }
  cogeNome(codice: string | null): string {
    if (!codice) return '—';
    const c = this.data.coge.find(x => x.codice === codice);
    return c ? `${c.codice} ${c.nome}` : codice;
  }
  /** Id del conto attualmente scelto (il modello qui è il CODICE) per il picker. */
  get selectedCogeId(): number | null {
    return this.data.coge.find(x => x.codice === this.cogeCodice)?.id ?? null;
  }
  /** Scelta dal picker → qui il modello resta il CODICE (identico al vecchio select). */
  setCoge(conto: PianoContiCogeDTO | null): void {
    this.cogeCodice = conto?.codice ?? null;
  }
  fornitoreNome(id: string | null): string {
    return id ? (this.data.fornitori.find(f => f.id === id)?.ragioneSociale ?? '—') : '—';
  }

  crea(): void {
    const k = this.kind();
    if (!k || !this.tokenValido() || !this.targetValido()) return;
    const evento = k === 'DOMINIO_EVENTO';
    const firma: KeywordFirmaDTO = {
      id: null,
      natura: k === 'IDENTITA' ? 'IDENTITA' : 'DOMINIO',
      azione: evento ? 'PARK_EVENTO' : 'BOOK',
      tipoMovimento: this.tipoMovimento,
      sorgente: this.sorgente,
      buId: evento ? null : this.buId,
      cogeCodice: evento ? null : this.cogeCodice,
      fornitoreId: k === 'IDENTITA' ? this.fornitoreId : null,
      eventoForza: evento ? this.eventoForza : null,
      tipoEvento: null,
      confidence: null,
      origine: 'MANUALE',
      stato: 'ATTIVA',
      note: this.note,
      token: this.tokens(),
      createdAt: null,
    };
    this.saving.set(true);
    this.movimentiService.createKeyword(firma).subscribe({
      next: () => { this.saving.set(false); this.snackBar.open('Keyword creata', 'OK', { duration: 2500 }); this.dialogRef.close(true); },
      error: err => { this.saving.set(false); this.snackBar.open(err.error?.message ?? 'Creazione non riuscita', 'OK', { duration: 4000 }); },
    });
  }

  annulla(): void { this.dialogRef.close(false); }
}
