import {
  Component,
  OnInit,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';

import { MovimentiService } from '../../core/services/movimenti.service';
import { ContiService } from '../../core/services/conti.service';
import { LookupService } from '../../core/services/lookup.service';
import { FornitoriService } from '../../core/services/fornitori.service';
import { EventiService } from '../../core/services/eventi.service';
import { BuService } from '../../core/services/bu.service';
import {
  AmbiguitaDTO,
  ClassificaAmbiguitaRequest,
  SuggerimentoControparteDTO,
} from '../../core/models/movimenti.models';
import {
  ContoBancarioDTO,
  MetodoPagamentoDTO,
  PianoContiCogeDTO,
  FornitoreSummaryDTO,
  BusinessUnitDTO,
} from '../../core/models/anagrafica.models';
import { EventoDTO } from '../../core/models/eventi.models';

interface RigaForm {
  cogeId: FormControl<number | null>;
  businessUnitId: FormControl<number | null>;
  metodoPagamentoId: FormControl<number | null>;
  contoBancarioId: FormControl<number | null>;
  fornitoreId: FormControl<string | null>;
  eventoId: FormControl<string | null>;
  tipoEventoMovimento: FormControl<string | null>;
  nota: FormControl<string | null>;
  aggiungiRegola: FormControl<boolean>;
}

@Component({
  selector: 'app-ambiguita-review-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatSlideToggleModule,
    MatExpansionModule,
    MatProgressSpinnerModule,
    MatChipsModule,
  ],
  templateUrl: './ambiguita-review-dialog.component.html',
  styleUrls: ['./ambiguita-review-dialog.component.scss'],
})
export class AmbiguitaReviewDialogComponent implements OnInit {
  private readonly data = inject<{ importLogId: string }>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<AmbiguitaReviewDialogComponent, boolean>);
  private readonly movimentiService = inject(MovimentiService);
  private readonly contiService = inject(ContiService);
  private readonly lookupService = inject(LookupService);
  private readonly fornitoriService = inject(FornitoriService);
  private readonly eventiService = inject(EventiService);
  private readonly buService = inject(BuService);
  private readonly snackBar = inject(MatSnackBar);

  readonly tipiEvento = ['CAPARRA', 'ACCONTO', 'SALDO', 'RIMBORSO'];

  loading = signal(true);
  saving = signal<string | null>(null); // id riga in salvataggio
  righe = signal<AmbiguitaDTO[]>([]);
  classificate = signal(0);

  // Suggerimenti controparte (ETL v2 §8.2): caricati on-demand all'apertura della riga.
  suggerimenti = signal<Record<string, SuggerimentoControparteDTO[]>>({});
  suggLoading = signal<string | null>(null);

  conti = signal<ContoBancarioDTO[]>([]);
  metodi = signal<MetodoPagamentoDTO[]>([]);
  coge = signal<PianoContiCogeDTO[]>([]);
  bu = signal<BusinessUnitDTO[]>([]);
  fornitori = signal<FornitoreSummaryDTO[]>([]);
  eventi = signal<EventoDTO[]>([]);

  private readonly forms = new Map<string, FormGroup<RigaForm>>();

  ngOnInit(): void {
    forkJoin({
      conti: this.contiService.getAll(),
      metodi: this.lookupService.getMetodiPagamento(),
      coge: this.lookupService.getPianoConti(),
      bu: this.buService.getAll(),
      fornitori: this.fornitoriService.getList({ size: 200 }),
      eventi: this.eventiService.getList({ size: 200 }),
      ambiguita: this.movimentiService.getAmbiguita(this.data.importLogId, 'DA_CLASSIFICARE', 0, 200),
    }).subscribe({
      next: ({ conti, metodi, coge, bu, fornitori, eventi, ambiguita }) => {
        this.conti.set(conti);
        this.metodi.set(metodi);
        this.coge.set(coge);
        this.bu.set(bu);
        this.fornitori.set(fornitori.content);
        this.eventi.set(eventi.content);
        ambiguita.content.forEach(a => this.forms.set(a.id, this.buildForm()));
        this.righe.set(ambiguita.content);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Errore nel caricamento delle ambiguità', 'OK', { duration: 4000 });
      },
    });
  }

  formFor(id: string): FormGroup<RigaForm> {
    return this.forms.get(id)!;
  }

  rawEntries(raw: Record<string, string>): { k: string; v: string }[] {
    return Object.entries(raw)
      .filter(([k]) => k !== '_SORGENTE')
      .map(([k, v]) => ({ k, v }));
  }

  canClassificare(id: string): boolean {
    const f = this.forms.get(id);
    return !!f && f.controls.cogeId.value != null && f.controls.businessUnitId.value != null;
  }

  // ── Suggerimenti controparte (top-3 fuzzy) ──────────────────────────────────
  suggerimentiFor(id: string): SuggerimentoControparteDTO[] {
    return this.suggerimenti()[id] ?? [];
  }

  pct(similarita: number): number {
    return Math.round(similarita * 100);
  }

  caricaSuggerimenti(amb: AmbiguitaDTO): void {
    if (this.suggerimenti()[amb.id] !== undefined) return; // già caricati
    this.suggLoading.set(amb.id);
    this.movimentiService.getSuggerimenti(amb.id).subscribe({
      next: list => {
        this.suggerimenti.update(m => ({ ...m, [amb.id]: list }));
        this.suggLoading.set(null);
      },
      error: () => {
        this.suggerimenti.update(m => ({ ...m, [amb.id]: [] }));
        this.suggLoading.set(null);
      },
    });
  }

  applicaSuggerimento(id: string, s: SuggerimentoControparteDTO): void {
    const f = this.forms.get(id);
    if (!f) return;
    if (s.cogeDefaultId != null) f.controls.cogeId.setValue(s.cogeDefaultId);
    if (s.buDefault != null) f.controls.businessUnitId.setValue(s.buDefault);
    if (s.fornitoreId) f.controls.fornitoreId.setValue(s.fornitoreId);
    this.snackBar.open(`Applicato: ${s.nome}`, 'OK', { duration: 1500 });
  }

  classifica(amb: AmbiguitaDTO): void {
    const f = this.forms.get(amb.id)!;
    const req: ClassificaAmbiguitaRequest = {
      cogeId: f.controls.cogeId.value,
      businessUnitId: f.controls.businessUnitId.value,
      metodoPagamentoId: f.controls.metodoPagamentoId.value,
      contoBancarioId: f.controls.contoBancarioId.value,
      fornitoreId: f.controls.fornitoreId.value,
      eventoId: f.controls.eventoId.value,
      tipoEventoMovimento: f.controls.tipoEventoMovimento.value,
      nota: f.controls.nota.value,
      aggiungiRegola: f.controls.aggiungiRegola.value,
      scarta: false,
    };
    this.invia(amb, req, 'Riga classificata');
  }

  scarta(amb: AmbiguitaDTO): void {
    const f = this.forms.get(amb.id)!;
    const req: ClassificaAmbiguitaRequest = {
      cogeId: null, businessUnitId: null, metodoPagamentoId: null, contoBancarioId: null,
      fornitoreId: null, eventoId: null, tipoEventoMovimento: null,
      nota: f.controls.nota.value, aggiungiRegola: false, scarta: true,
    };
    this.invia(amb, req, 'Riga scartata');
  }

  private invia(amb: AmbiguitaDTO, req: ClassificaAmbiguitaRequest, okMsg: string): void {
    this.saving.set(amb.id);
    this.movimentiService.classificaAmbiguita(amb.id, req).subscribe({
      next: () => {
        this.saving.set(null);
        this.righe.update(rs => rs.filter(r => r.id !== amb.id));
        if (!req.scarta) this.classificate.update(c => c + 1);
        this.forms.delete(amb.id);
        this.snackBar.open(okMsg, 'OK', { duration: 2500 });
      },
      error: err => {
        this.saving.set(null);
        const msg = err.error?.message ?? 'Errore durante la classificazione';
        this.snackBar.open(msg, 'OK', { duration: 4000 });
      },
    });
  }

  close(): void {
    this.dialogRef.close(this.classificate() > 0);
  }

  private buildForm(): FormGroup<RigaForm> {
    return new FormGroup<RigaForm>({
      cogeId: new FormControl<number | null>(null),
      businessUnitId: new FormControl<number | null>(null),
      metodoPagamentoId: new FormControl<number | null>(null),
      contoBancarioId: new FormControl<number | null>(null),
      fornitoreId: new FormControl<string | null>(null),
      eventoId: new FormControl<string | null>(null),
      tipoEventoMovimento: new FormControl<string | null>(null),
      nota: new FormControl<string | null>(null),
      aggiungiRegola: new FormControl<boolean>(false, { nonNullable: true }),
    });
  }
}
