import {
  Component,
  OnInit,
  inject,
  signal,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';

import { MovimentiService } from '../../core/services/movimenti.service';
import { LookupService } from '../../core/services/lookup.service';
import { FornitoriService } from '../../core/services/fornitori.service';
import { BuService } from '../../core/services/bu.service';
import {
  ImportKpiDTO,
  TransitorioDTO,
  EventoParcheggiatoDTO,
  SuggerimentoControparteDTO,
  ClassificaTransitorioRequest,
  RisolviEventoRequest,
} from '../../core/models/movimenti.models';
import {
  PianoContiCogeDTO,
  FornitoreSummaryDTO,
  BusinessUnitDTO,
} from '../../core/models/anagrafica.models';

interface TransForm {
  cogeId: FormControl<number | null>;
  businessUnitId: FormControl<number | null>;
  fornitoreId: FormControl<string | null>;
  apprendiControparte: FormControl<boolean>;
  nota: FormControl<string | null>;
}

interface EventoForm {
  cogeId: FormControl<number | null>;
  businessUnitId: FormControl<number | null>;
  nota: FormControl<string | null>;
}

/**
 * Centro di smistamento import: catalogazione dei movimenti finiti sui conti
 * transitori (39.99.999 / 49.99.999) e gestione degli eventi parcheggiati.
 * Ogni azione aggiorna i contatori KPI in tempo reale.
 */
@Component({
  selector: 'app-import-triage-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatSlideToggleModule,
    MatExpansionModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTooltipModule,
  ],
  templateUrl: './import-triage-dialog.component.html',
  styleUrls: ['./import-triage-dialog.component.scss'],
})
export class ImportTriageDialogComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<ImportTriageDialogComponent, boolean>);
  private readonly movimentiService = inject(MovimentiService);
  private readonly lookupService = inject(LookupService);
  private readonly fornitoriService = inject(FornitoriService);
  private readonly buService = inject(BuService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly cdr = inject(ChangeDetectorRef);

  loading = signal(true);
  saving = signal<string | null>(null);
  modificato = false;

  kpi = signal<ImportKpiDTO | null>(null);
  transitori = signal<TransitorioDTO[]>([]);
  eventi = signal<EventoParcheggiatoDTO[]>([]);

  coge = signal<PianoContiCogeDTO[]>([]);
  bu = signal<BusinessUnitDTO[]>([]);
  fornitori = signal<FornitoreSummaryDTO[]>([]);

  suggerimenti = signal<Record<string, SuggerimentoControparteDTO[]>>({});
  suggLoading = signal<string | null>(null);

  private readonly transForms = new Map<string, FormGroup<TransForm>>();
  private readonly eventoForms = new Map<string, FormGroup<EventoForm>>();

  ngOnInit(): void {
    forkJoin({
      coge: this.lookupService.getPianoConti(),
      bu: this.buService.getAll(),
      fornitori: this.fornitoriService.getList({ size: 300 }),
      kpi: this.movimentiService.getImportKpi(),
      transitori: this.movimentiService.getTransitori(undefined, 0, 200),
      eventi: this.movimentiService.getEventiParcheggiati('DA_RICONCILIARE', 0, 200),
    }).subscribe({
      next: ({ coge, bu, fornitori, kpi, transitori, eventi }) => {
        this.coge.set(coge);
        this.bu.set(bu);
        this.fornitori.set(fornitori.content);
        this.kpi.set(kpi);
        transitori.content.forEach(t => this.transForms.set(t.id, this.buildTransForm()));
        this.transitori.set(transitori.content);
        eventi.content.forEach(e => this.eventoForms.set(e.id, this.buildEventoForm()));
        this.eventi.set(eventi.content);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Errore nel caricamento dello smistamento import', 'OK', { duration: 4000 });
        this.cdr.markForCheck();
      },
    });
  }

  private refreshKpi(): void {
    this.movimentiService.getImportKpi().subscribe(k => { this.kpi.set(k); this.cdr.markForCheck(); });
  }

  // ── Transitori ──────────────────────────────────────────────────────────────
  transFormFor(id: string): FormGroup<TransForm> { return this.transForms.get(id)!; }

  canClassificareTrans(id: string): boolean {
    const f = this.transForms.get(id);
    return !!f && f.controls.cogeId.value != null && f.controls.businessUnitId.value != null;
  }

  suggerimentiFor(id: string): SuggerimentoControparteDTO[] { return this.suggerimenti()[id] ?? []; }
  pct(s: number): number { return Math.round(s * 100); }

  caricaSuggerimenti(t: TransitorioDTO): void {
    if (this.suggerimenti()[t.id] !== undefined) return;
    this.suggLoading.set(t.id);
    this.movimentiService.getSuggerimentiTransitorio(t.id).subscribe({
      next: list => { this.suggerimenti.update(m => ({ ...m, [t.id]: list })); this.suggLoading.set(null); this.cdr.markForCheck(); },
      error: () => { this.suggerimenti.update(m => ({ ...m, [t.id]: [] })); this.suggLoading.set(null); this.cdr.markForCheck(); },
    });
  }

  applicaSuggerimento(id: string, s: SuggerimentoControparteDTO): void {
    const f = this.transForms.get(id);
    if (!f) return;
    if (s.cogeDefaultId != null) f.controls.cogeId.setValue(s.cogeDefaultId);
    if (s.buDefault != null) f.controls.businessUnitId.setValue(s.buDefault);
    if (s.fornitoreId) f.controls.fornitoreId.setValue(s.fornitoreId);
    f.controls.apprendiControparte.setValue(true);
    this.snackBar.open(`Applicato: ${s.nome}`, 'OK', { duration: 1500 });
  }

  classificaTrans(t: TransitorioDTO): void {
    const f = this.transForms.get(t.id)!;
    const req: ClassificaTransitorioRequest = {
      cogeId: f.controls.cogeId.value!,
      businessUnitId: f.controls.businessUnitId.value!,
      fornitoreId: f.controls.fornitoreId.value,
      apprendiControparte: f.controls.apprendiControparte.value,
      nota: f.controls.nota.value,
    };
    this.saving.set(t.id);
    this.movimentiService.classificaTransitorio(t.id, req).subscribe({
      next: () => {
        this.saving.set(null);
        this.transitori.update(rs => rs.filter(r => r.id !== t.id));
        this.transForms.delete(t.id);
        this.modificato = true;
        this.refreshKpi();
        this.snackBar.open('Movimento catalogato' + (req.apprendiControparte ? ' e controparte appresa' : ''), 'OK', { duration: 2500 });
        this.cdr.markForCheck();
      },
      error: err => this.fail(err),
    });
  }

  // ── Eventi ──────────────────────────────────────────────────────────────────
  eventoFormFor(id: string): FormGroup<EventoForm> { return this.eventoForms.get(id)!; }

  canClassificareEvento(id: string): boolean {
    const f = this.eventoForms.get(id);
    return !!f && f.controls.cogeId.value != null && f.controls.businessUnitId.value != null;
  }

  scartaEvento(ev: EventoParcheggiatoDTO): void {
    this.risolvi(ev, { azione: 'SCARTA', cogeId: null, businessUnitId: null, eventoId: null, nota: this.eventoFormFor(ev.id).controls.nota.value }, 'Evento scartato');
  }

  riconciliaEvento(ev: EventoParcheggiatoDTO): void {
    this.risolvi(ev, { azione: 'RICONCILIA', cogeId: null, businessUnitId: null, eventoId: null, nota: this.eventoFormFor(ev.id).controls.nota.value }, 'Evento segnato come riconciliato');
  }

  classificaEvento(ev: EventoParcheggiatoDTO): void {
    const f = this.eventoFormFor(ev.id);
    this.risolvi(ev, { azione: 'CLASSIFICA', cogeId: f.controls.cogeId.value, businessUnitId: f.controls.businessUnitId.value, eventoId: null, nota: f.controls.nota.value }, 'Evento registrato come movimento');
  }

  private risolvi(ev: EventoParcheggiatoDTO, req: RisolviEventoRequest, okMsg: string): void {
    this.saving.set(ev.id);
    this.movimentiService.risolviEvento(ev.id, req).subscribe({
      next: () => {
        this.saving.set(null);
        this.eventi.update(rs => rs.filter(r => r.id !== ev.id));
        this.eventoForms.delete(ev.id);
        this.modificato = true;
        this.refreshKpi();
        this.snackBar.open(okMsg, 'OK', { duration: 2500 });
        this.cdr.markForCheck();
      },
      error: err => this.fail(err),
    });
  }

  private fail(err: { error?: { message?: string } }): void {
    this.saving.set(null);
    this.snackBar.open(err.error?.message ?? 'Operazione non riuscita', 'OK', { duration: 4000 });
    this.cdr.markForCheck();
  }

  close(): void { this.dialogRef.close(this.modificato); }

  private buildTransForm(): FormGroup<TransForm> {
    return new FormGroup<TransForm>({
      cogeId: new FormControl<number | null>(null),
      businessUnitId: new FormControl<number | null>(null),
      fornitoreId: new FormControl<string | null>(null),
      apprendiControparte: new FormControl<boolean>(true, { nonNullable: true }),
      nota: new FormControl<string | null>(null),
    });
  }

  private buildEventoForm(): FormGroup<EventoForm> {
    return new FormGroup<EventoForm>({
      cogeId: new FormControl<number | null>(null),
      businessUnitId: new FormControl<number | null>(null),
      nota: new FormControl<string | null>(null),
    });
  }
}
