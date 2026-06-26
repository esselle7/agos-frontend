import { Component, OnInit, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';

import { MovimentiService } from '../../core/services/movimenti.service';
import { LookupService } from '../../core/services/lookup.service';
import { BuService } from '../../core/services/bu.service';
import { FornitoriService } from '../../core/services/fornitori.service';
import { KeywordFirmaDTO, KeywordConflittoDTO } from '../../core/models/movimenti.models';
import { PianoContiCogeDTO, BusinessUnitDTO, FornitoreSummaryDTO } from '../../core/models/anagrafica.models';
import { KeywordVisual, keywordVisual, tipoMovLabel } from './keyword-visual';
import { KeywordCreateWizardComponent } from './keyword-create-wizard.component';

@Component({
  selector: 'app-keyword-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgTemplateOutlet, FormsModule, MatCardModule, MatTabsModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatFormFieldModule, MatInputModule, MatProgressSpinnerModule, MatTooltipModule,
    MatDialogModule,
  ],
  templateUrl: './keyword-page.component.html',
  styleUrls: ['./keyword-page.component.scss'],
})
export class KeywordPageComponent implements OnInit {
  private readonly movimentiService = inject(MovimentiService);
  private readonly lookupService = inject(LookupService);
  private readonly buService = inject(BuService);
  private readonly fornitoriService = inject(FornitoriService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  loading = signal(true);
  firme = signal<KeywordFirmaDTO[]>([]);
  conflitti = signal<KeywordConflittoDTO[]>([]);
  filtro = signal('');

  coge = signal<PianoContiCogeDTO[]>([]);
  bu = signal<BusinessUnitDTO[]>([]);
  fornitori = signal<FornitoreSummaryDTO[]>([]);

  private filtra(list: KeywordFirmaDTO[]): KeywordFirmaDTO[] {
    const q = this.filtro().trim().toUpperCase();
    if (!q) return list;
    return list.filter(f => f.token.some(t => t.includes(q)) || (f.cogeCodice ?? '').includes(q));
  }

  identita = computed(() => this.filtra(this.firme().filter(f => f.natura === 'IDENTITA')));
  dominio = computed(() => this.filtra(this.firme().filter(f => f.natura === 'DOMINIO')));

  ngOnInit(): void {
    this.carica();
  }

  private carica(): void {
    forkJoin({
      firme: this.movimentiService.getKeyword(),
      conflitti: this.movimentiService.getKeywordConflitti('APERTO'),
      coge: this.lookupService.getPianoConti(),
      bu: this.buService.getAll(),
      fornitori: this.fornitoriService.getList({ size: 300 }),
    }).subscribe({
      next: ({ firme, conflitti, coge, bu, fornitori }) => {
        this.firme.set(firme);
        this.conflitti.set(conflitti);
        this.coge.set(coge);
        this.bu.set(bu);
        this.fornitori.set(fornitori.content);
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); this.snackBar.open('Errore nel caricamento keyword', 'OK', { duration: 4000 }); },
    });
  }

  visual(f: KeywordFirmaDTO): KeywordVisual {
    return keywordVisual(f.natura, f.azione);
  }

  /** Frase in italiano: cosa fa concretamente la keyword (per la card). */
  frase(f: KeywordFirmaDTO): string {
    const tk = f.token.join(' + ');
    const quando = `Quando una riga ${tipoMovLabel(f.tipoMovimento)} contiene «${tk}»`;
    if (f.azione === 'PARK_EVENTO') {
      return `${quando} → la metto in attesa di riconciliazione (evento, nessun movimento).`;
    }
    const cogeTxt = this.cogeNome(f.cogeCodice);
    const buTxt = this.buNome(f.buId);
    if (f.natura === 'IDENTITA') {
      const forn = f.fornitoreId ? `, fornitore ${this.fornitoreNome(f.fornitoreId)}` : '';
      return `${quando} → la registro su ${cogeTxt} (${buTxt})${forn}.`;
    }
    return `${quando} → la registro su ${cogeTxt} (${buTxt}), senza fornitore.`;
  }

  buNome(id: number | null): string {
    return id == null ? '—' : (this.bu().find(b => b.id === id)?.nome ?? `BU${id}`);
  }
  cogeNome(codice: string | null): string {
    if (!codice) return '—';
    const c = this.coge().find(x => x.codice === codice);
    return c ? `${c.codice} ${c.nome}` : codice;
  }
  fornitoreNome(id: string | null): string {
    return id ? (this.fornitori().find(f => f.id === id)?.ragioneSociale ?? '—') : '—';
  }

  apriWizard(): void {
    this.dialog.open(KeywordCreateWizardComponent, {
      data: { coge: this.coge(), bu: this.bu(), fornitori: this.fornitori() },
      width: '720px', maxWidth: '95vw', autoFocus: false,
    }).afterClosed().subscribe(creato => { if (creato) this.carica(); });
  }

  eliminaFirma(f: KeywordFirmaDTO): void {
    if (!f.id) return;
    this.movimentiService.deleteKeyword(f.id).subscribe({
      next: () => { this.firme.update(rs => rs.filter(r => r.id !== f.id)); this.snackBar.open('Keyword eliminata', 'OK', { duration: 2000 }); },
      error: err => this.snackBar.open(err.error?.message ?? 'Eliminazione non riuscita', 'OK', { duration: 4000 }),
    });
  }

  toggleStato(f: KeywordFirmaDTO): void {
    if (!f.id) return;
    const nuovo = f.stato === 'DISATTIVATA' ? 'ATTIVA' : 'DISATTIVATA';
    this.movimentiService.updateKeyword(f.id, { ...f, stato: nuovo }).subscribe({
      next: () => this.firme.update(rs => rs.map(r => r.id === f.id ? { ...r, stato: nuovo } : r)),
      error: err => this.snackBar.open(err.error?.message ?? 'Aggiornamento non riuscito', 'OK', { duration: 4000 }),
    });
  }

  risolvi(c: KeywordConflittoDTO, azione: 'TIENI_ESISTENTE' | 'USA_NUOVO' | 'SCARTA'): void {
    this.movimentiService.risolviKeywordConflitto(c.id, { azione, note: null }).subscribe({
      next: () => { this.conflitti.update(cs => cs.filter(x => x.id !== c.id)); this.carica(); this.snackBar.open('Conflitto risolto', 'OK', { duration: 2000 }); },
      error: err => this.snackBar.open(err.error?.message ?? 'Risoluzione non riuscita', 'OK', { duration: 4000 }),
    });
  }
}
