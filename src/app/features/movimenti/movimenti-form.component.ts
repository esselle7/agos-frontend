import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  inject,
  signal,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { Location } from '@angular/common';
import {
  ReactiveFormsModule,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import {
  Subject, merge, switchMap, debounceTime,
  distinctUntilChanged, of, takeUntil, forkJoin, EMPTY,
} from 'rxjs';

import { MovimentiService } from '../../core/services/movimenti.service';
import { ContiService } from '../../core/services/conti.service';
import { CategorieService } from '../../core/services/categorie.service';
import { FornitoriService } from '../../core/services/fornitori.service';
import { EventiService } from '../../core/services/eventi.service';
import { LookupService } from '../../core/services/lookup.service';
import { BuSelectorComponent } from '../../shared/components/bu-selector/bu-selector.component';
import { CurrencyInputComponent } from '../../shared/components/currency-input/currency-input.component';
import { EuroPipe } from '../../shared/pipes/euro.pipe';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { MovimentoCreateRequest, MovimentoDTO, TipoMovimento } from '../../core/models/movimenti.models';
import {
  ContoBancarioDTO, CategoriaNode, FornitoreSummaryDTO,
  PianoContiCogeDTO, MetodoPagamentoDTO, AliquotaIvaDTO,
} from '../../core/models/anagrafica.models';
import { EventoDTO } from '../../core/models/eventi.models';

const FONTI = ['MANUALE', 'IMPORT_CSV', 'STRIPE', 'SATISPAY', 'SHOPIFY', 'BILLY'];

const TIPO_COGE_LABEL: Record<string, string> = {
  RICAVI:       'Ricavi',
  COSTI:        'Costi',
  PATRIMONIALE: 'Patrimoniale',
};

interface GruppoCogeDisplay {
  tipo: string;
  nomeGruppo: string;
  conti: PianoContiCogeDTO[];
}

@Component({
  selector: 'app-movimenti-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSlideToggleModule,
    MatAutocompleteModule,
    MatExpansionModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDividerModule,
    BuSelectorComponent,
    CurrencyInputComponent,
    EuroPipe,
    SkeletonLoaderComponent,
  ],
  templateUrl: './movimenti-form.component.html',
  styleUrls: ['./movimenti-form.component.scss'],
})
export class MovimentiFormComponent implements OnInit, OnDestroy {
  @Input() id?: string;

  private readonly movimentiService = inject(MovimentiService);
  private readonly contiService = inject(ContiService);
  private readonly categorieService = inject(CategorieService);
  private readonly fornitoriService = inject(FornitoriService);
  private readonly eventiService = inject(EventiService);
  private readonly lookupService = inject(LookupService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  readonly fonti = FONTI;

  loading = signal(false);
  submitting = signal(false);
  conti = signal<ContoBancarioDTO[]>([]);
  metodiPagamento = signal<MetodoPagamentoDTO[]>([]);
  aliquoteIva = signal<AliquotaIvaDTO[]>([]);
  categoriePadre = signal<CategoriaNode[]>([]);
  categorieFiglio = signal<CategoriaNode[]>([]);
  filteredFornitori = signal<FornitoreSummaryDTO[]>([]);
  filteredEventi = signal<EventoDTO[]>([]);

  showEventoSection = false;
  showDateAvanzate = false;

  cogeGruppi = signal<GruppoCogeDisplay[]>([]);
  private pianoContiAll: PianoContiCogeDTO[] = [];

  // Separate controls for autocompletes (display values)
  readonly fornitoreSearch = new FormControl<string>('', { nonNullable: true });
  readonly eventoSearch = new FormControl<string>('', { nonNullable: true });

  // Pending categoria to restore in edit mode
  private pendingCategoriaId: number | null = null;

  form = new FormGroup({
    tipo: new FormControl<TipoMovimento>('ENTRATA', { nonNullable: true }),
    importo: new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]),
    dataMovimento: new FormControl<Date | null>(null, Validators.required),
    descrizione: new FormControl<string>('', { nonNullable: true, validators: Validators.required }),
    businessUnitId: new FormControl<number | null>(null, Validators.required),
    contoBancarioId: new FormControl<number | null>(null, Validators.required),
    metodoPagamentoId: new FormControl<number | null>(null, Validators.required),
    categoriaPadreId: new FormControl<number | null>({ value: null, disabled: true }),
    categoriaFiglioId: new FormControl<number | null>(null),
    contoCoge: new FormControl<number | null>(null, Validators.required),
    fornitoreId: new FormControl<string | null>(null),
    eventoId: new FormControl<string | null>(null),
    tipoEventoMovimento: new FormControl<string | null>(null),
    dataCompetenza: new FormControl<Date | null>(null),
    dataLiquidita: new FormControl<Date | null>(null),
    importoLordo: new FormControl<number | null>(null),
    aliquotaIva: new FormControl<number | null>(null),
    note: new FormControl<string | null>(null),
    riferimentoEsterno: new FormControl<string | null>(null),
    fonte: new FormControl<string>('MANUALE', { nonNullable: true }),
  });

  get isEditMode(): boolean {
    return !!this.id;
  }

  get tipoValue(): TipoMovimento {
    return this.form.controls.tipo.value;
  }

  get importoIvaCalcolato(): number | null {
    const imp = this.form.controls.importo.value;
    const aliq = this.form.controls.aliquotaIva.value;
    if (imp != null && aliq != null) {
      return Math.round(imp * aliq * 100) / 100;
    }
    return null;
  }

  get hasBu(): boolean {
    return this.form.controls.businessUnitId.value !== null;
  }

  ngOnInit(): void {
    // Load all lookup tables first; in edit mode, load the movimento only after
    // they are ready so cogeDisplayLabel can resolve IDs to names immediately.
    forkJoin({
      conti:    this.contiService.getAll(),
      metodi:   this.lookupService.getMetodiPagamento(),
      piano:    this.lookupService.getPianoConti(),
      aliquote: this.lookupService.getAliquoteIva(),
    }).subscribe(({ conti, metodi, piano, aliquote }) => {
      this.conti.set(conti);
      this.metodiPagamento.set(metodi);
      this.aliquoteIva.set(aliquote);
      this.pianoContiAll = piano;
      this.rebuildCogeGruppi();

      if (this.isEditMode) {
        this.loadMovimento();
      }
    });

    // Enable/disable categoria reactively (avoids [disabled] binding warning)
    this.form.controls.businessUnitId.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(buId => {
      buId ? this.form.controls.categoriaPadreId.enable() : this.form.controls.categoriaPadreId.disable();
    });

    // Reload categories when BU OR tipo changes — switchMap cancels in-flight requests on rapid changes
    merge(
      this.form.controls.businessUnitId.valueChanges,
      this.form.controls.tipo.valueChanges,
    ).pipe(
      debounceTime(0),
      switchMap(() => {
        const buId = this.form.controls.businessUnitId.value;
        if (!buId) {
          this.categoriePadre.set([]);
          this.categorieFiglio.set([]);
          this.pendingCategoriaId = null;
          return EMPTY;
        }
        return this.categorieService.getAlbero(buId);
      }),
      takeUntil(this.destroy$),
    ).subscribe(data => {
      const tipo = this.form.controls.tipo.value;
      const filtrate = data.filter(c => c.tipo === tipo);
      this.categoriePadre.set(filtrate);
      this.categorieFiglio.set([]);

      if (this.pendingCategoriaId !== null) {
        this.restoreCategoria(filtrate, this.pendingCategoriaId);
        this.pendingCategoriaId = null;
      } else {
        this.form.controls.categoriaPadreId.setValue(null, { emitEvent: false });
        this.form.controls.categoriaFiglioId.setValue(null, { emitEvent: false });
      }

      this.cdr.markForCheck();
    });

    // When tipo changes, reset CoGe and rebuild the filtered group for the new tipo
    this.form.controls.tipo.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.form.controls.contoCoge.setValue(null, { emitEvent: false });
      this.rebuildCogeGruppi();
    });

    // When parent category changes, load children
    this.form.controls.categoriaPadreId.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(parentId => {
        const parent = this.categoriePadre().find(c => c.id === parentId);
        this.categorieFiglio.set(parent?.sottocategorie ?? []);
        this.form.controls.categoriaFiglioId.setValue(null, { emitEvent: false });
        this.cdr.markForCheck();
      });

    // Fornitore autocomplete
    this.fornitoreSearch.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(search => {
        if (!search || search.length < 2) return of({ content: [] as FornitoreSummaryDTO[], page: 0, size: 20, totalElements: 0, totalPages: 0 });
        return this.fornitoriService.getList({ search, size: 20 });
      }),
      takeUntil(this.destroy$),
    ).subscribe(res => {
      this.filteredFornitori.set(res.content);
      this.cdr.markForCheck();
    });

    // Evento autocomplete
    this.eventoSearch.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(search => {
        if (!search || search.length < 2) return of({ content: [] as EventoDTO[], page: 0, size: 20, totalElements: 0, totalPages: 0 });
        return this.eventiService.getList({ search, size: 20 });
      }),
      takeUntil(this.destroy$),
    ).subscribe(res => {
      this.filteredEventi.set(res.content);
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadMovimento(): void {
    this.loading.set(true);
    this.movimentiService.getById(this.id!).subscribe({
      next: mov => {
        this.populateForm(mov);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Errore nel caricamento del movimento', 'OK', { duration: 3000 });
        this.router.navigate(['/movimenti']);
      },
    });
  }

  private populateForm(mov: MovimentoDTO): void {
    this.pendingCategoriaId = mov.categoriaId ?? null;

    this.form.patchValue({
      tipo: mov.tipo,
      importo: mov.importo,
      dataMovimento: mov.dataMovimento ? this.parseDate(mov.dataMovimento) : null,
      descrizione: mov.descrizione,
      businessUnitId: mov.businessUnitId,
      contoBancarioId: mov.contoBancarioId,
      metodoPagamentoId: mov.metodoPagamentoId,
      contoCoge: mov.contoCoge,
      fornitoreId: mov.fornitoreId,
      eventoId: mov.eventoId,
      tipoEventoMovimento: mov.tipoEventoMovimento,
      dataCompetenza: mov.dataCompetenza ? this.parseDate(mov.dataCompetenza) : null,
      dataLiquidita: mov.dataLiquidita ? this.parseDate(mov.dataLiquidita) : null,
      importoLordo: null,
      aliquotaIva: this.findAliquota(mov.importoIva, mov.importoImponibile),
      note: mov.note,
      riferimentoEsterno: mov.riferimentoEsterno,
      fonte: mov.fonte ?? 'MANUALE',
    });

    if (mov.eventoId) this.showEventoSection = true;
    if (mov.dataCompetenza || mov.dataLiquidita) this.showDateAvanzate = true;

    if (mov.fornitoreId) {
      this.fornitoriService.getById(mov.fornitoreId).subscribe(f => {
        this.fornitoreSearch.setValue(f.ragioneSociale, { emitEvent: false });
        this.cdr.markForCheck();
      });
    }
  }

  private restoreCategoria(categorie: CategoriaNode[], id: number): void {
    const padre = categorie.find(c => c.id === id);
    if (padre) {
      this.form.controls.categoriaPadreId.setValue(padre.id, { emitEvent: false });
      return;
    }
    for (const p of categorie) {
      const figlio = (p.sottocategorie ?? []).find(s => s.id === id);
      if (figlio) {
        this.form.controls.categoriaPadreId.setValue(p.id, { emitEvent: false });
        this.categorieFiglio.set(p.sottocategorie);
        this.form.controls.categoriaFiglioId.setValue(figlio.id, { emitEvent: false });
        return;
      }
    }
  }

  onFornitoreSelected(event: MatAutocompleteSelectedEvent): void {
    const id = event.option.value as string;
    const found = this.filteredFornitori().find(f => f.id === id);
    if (!found) return;
    this.form.controls.fornitoreId.setValue(id);
    this.fornitoreSearch.setValue(found.ragioneSociale, { emitEvent: false });

    if (!this.form.controls.contoCoge.value) {
      this.fornitoriService.getById(id).subscribe(f => {
        if (f.cogeDefaultId) {
          this.form.controls.contoCoge.setValue(f.cogeDefaultId, { emitEvent: false });
          this.cdr.markForCheck();
        }
      });
    }
  }

  clearFornitore(): void {
    this.fornitoreSearch.setValue('');
    this.form.controls.fornitoreId.setValue(null);
  }

  onEventoSelected(event: MatAutocompleteSelectedEvent): void {
    const nome = event.option.value as string;
    const found = this.filteredEventi().find(e => e.nome === nome);
    this.form.controls.eventoId.setValue(found?.id ?? null);
  }

  clearEvento(): void {
    this.eventoSearch.setValue('');
    this.form.controls.eventoId.setValue(null);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    const body = this.buildRequest();

    const obs = this.isEditMode
      ? this.movimentiService.update(this.id!, body)
      : this.movimentiService.create(body);

    obs.subscribe({
      next: () => {
        this.submitting.set(false);
        this.snackBar.open('Movimento salvato', 'OK', { duration: 3000 });
        this.router.navigate(['/movimenti']);
      },
      error: err => {
        this.submitting.set(false);
        if (err.status === 400 && err.error?.details) {
          this.applyServerErrors(err.error.details);
        } else {
          this.snackBar.open('Errore durante il salvataggio', 'OK', { duration: 3000 });
        }
        this.cdr.markForCheck();
      },
    });
  }

  goBack(): void {
    this.location.back();
  }

  private buildRequest(): MovimentoCreateRequest {
    const v = this.form.getRawValue();
    const categoriaId = v.categoriaFiglioId ?? v.categoriaPadreId ?? null;
    return {
      tipo: v.tipo,
      importo: v.importo!,
      importoLordo: v.importoLordo,
      aliquotaIva: v.aliquotaIva,
      dataMovimento: this.formatDate(v.dataMovimento!),
      dataCompetenza: v.dataCompetenza ? this.formatDate(v.dataCompetenza) : null,
      dataLiquidita: v.dataLiquidita ? this.formatDate(v.dataLiquidita) : null,
      contoBancarioId: v.contoBancarioId!,
      metodoPagamentoId: v.metodoPagamentoId!,
      businessUnitId: v.businessUnitId!,
      contoCoge: v.contoCoge!,
      categoriaId,
      fornitoreId: v.fornitoreId,
      eventoId: v.eventoId,
      tipoEventoMovimento: v.tipoEventoMovimento,
      descrizione: v.descrizione,
      note: v.note,
      riferimentoEsterno: v.riferimentoEsterno,
      fonte: v.fonte || 'MANUALE',
      allegatoPath: null,
    };
  }

  private applyServerErrors(details: Record<string, string>): void {
    for (const [campo, msg] of Object.entries(details)) {
      const ctrl = this.form.get(campo);
      if (ctrl) ctrl.setErrors({ server: msg });
    }
  }

  // Builds the CoGe optgroup for the current tipo: ENTRATA→RICAVI, USCITA→COSTI, sorted by codice.
  private rebuildCogeGruppi(): void {
    const tipo = this.form.controls.tipo.value;
    const allowedTipo = tipo === 'ENTRATA' ? 'RICAVI' : 'COSTI';
    const conti = this.pianoContiAll
      .filter(c => c.tipo === allowedTipo)
      .sort((a, b) => a.codice.localeCompare(b.codice));
    this.cogeGruppi.set(conti.length > 0 ? [{
      tipo: allowedTipo,
      nomeGruppo: TIPO_COGE_LABEL[allowedTipo] ?? allowedTipo,
      conti,
    }] : []);
    this.cdr.markForCheck();
  }

  // Back-calculates aliquota from IVA/imponibile amounts and matches against known rates.
  private findAliquota(importoIva: number | null, importoImponibile: number | null): number | null {
    if (!importoIva || !importoImponibile) return null;
    const rate = importoIva / importoImponibile;
    const match = this.aliquoteIva().find(a => Math.abs(a.aliquota - rate) < 0.001);
    return match ? match.aliquota : Math.round(rate * 10000) / 10000;
  }

  private parseDate(str: string): Date {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  private formatDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
