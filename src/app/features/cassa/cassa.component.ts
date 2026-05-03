import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  inject,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import {
  ReactiveFormsModule,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { CassaService } from '../../core/services/cassa.service';
import { ContiService } from '../../core/services/conti.service';
import { LookupService } from '../../core/services/lookup.service';
import { AuthService } from '../../core/auth/auth.service';
import {
  CassaMovimentoDTO,
  CreateCassaMovimentoRequest,
  SaldoResponse,
} from '../../core/models/cassa.models';
import { ContoBancarioDTO, PianoContiCogeDTO } from '../../core/models/anagrafica.models';
import { PagedResponse } from '../../core/models/shared.models';
import { EuroPipe } from '../../shared/pipes/euro.pipe';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { CurrencyInputComponent } from '../../shared/components/currency-input/currency-input.component';
import { BuSelectorComponent } from '../../shared/components/bu-selector/bu-selector.component';

@Component({
  selector: 'app-cassa',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatTooltipModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatAutocompleteModule,
    EuroPipe,
    BadgeComponent,
    EmptyStateComponent,
    SkeletonLoaderComponent,
    CurrencyInputComponent,
    BuSelectorComponent,
  ],
  templateUrl: './cassa.component.html',
  styleUrls: ['./cassa.component.scss'],
})
export class CassaComponent implements OnInit, OnDestroy {
  private readonly cassaService = inject(CassaService);
  private readonly contiService = inject(ContiService);
  private readonly lookupService = inject(LookupService);
  readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  readonly displayedColumns = ['dataMovimento', 'tipo', 'descrizione', 'conto', 'importo', 'stato', 'azioni'];

  saldo = signal<SaldoResponse | null>(null);
  saldoLoading = signal(true);
  result = signal<PagedResponse<CassaMovimentoDTO> | null>(null);
  loading = signal(false);
  saving = signal(false);
  contiBancari = signal<ContoBancarioDTO[]>([]);
  contiMap = signal<Map<number, string>>(new Map());

  // CoGe autocomplete for quick form
  filteredCoge = signal<PianoContiCogeDTO[]>([]);
  readonly cogeSearch = new FormControl<string>('', { nonNullable: true });
  private pianoContiAll: PianoContiCogeDTO[] = [];

  readonly fromControl = new FormControl<Date | null>(null);
  readonly toControl = new FormControl<Date | null>(null);

  readonly quickForm = new FormGroup({
    tipo:           new FormControl<string>('PRELIEVO_DA_BANCA', { nonNullable: true }),
    importo:        new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]),
    dataMovimento:  new FormControl<Date>(new Date(), { nonNullable: true, validators: [Validators.required] }),
    descrizione:    new FormControl<string | null>(null),
    contoBancaId:   new FormControl<number | null>(null, [Validators.required]),
    businessUnitId: new FormControl<number | null>(null),
    contoCoge:      new FormControl<number | null>(null),
  });

  private currentPage = 0;
  private currentSize = 20;

  ngOnInit(): void {
    this.loadSaldo();
    this.contiService.getAll().subscribe(conti => {
      const bancari = conti.filter(c => c.tipo === 'BANCARIO');
      this.contiBancari.set(bancari);
      this.contiMap.set(new Map(conti.map(c => [c.id, c.nome])));
      this.cdr.markForCheck();
    });
    this.lookupService.getPianoConti().subscribe(piano => {
      this.pianoContiAll = piano;
      this.filteredCoge.set(piano);
      this.cdr.markForCheck();
    });
    this.cogeSearch.valueChanges.pipe(
      debounceTime(150),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe(q => {
      const search = q.toLowerCase().trim();
      this.filteredCoge.set(
        search
          ? this.pianoContiAll.filter(c =>
              c.nome.toLowerCase().includes(search) || c.codice.toLowerCase().includes(search)
            )
          : this.pianoContiAll
      );
      this.cdr.markForCheck();
    });
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadSaldo(): void {
    this.saldoLoading.set(true);
    this.cassaService.getSaldo().subscribe({
      next: s => {
        this.saldo.set(s);
        this.saldoLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.saldoLoading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  loadData(): void {
    this.loading.set(true);
    const from = this.fromControl.value;
    const to = this.toControl.value;
    this.cassaService.getMovimenti({
      page: this.currentPage,
      size: this.currentSize,
      from: from ? this.toIso(from) : undefined,
      to:   to   ? this.toIso(to)   : undefined,
    }).subscribe({
      next: res => {
        this.result.set(res);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Errore nel caricamento dei movimenti cassa', 'OK', { duration: 3000 });
        this.cdr.markForCheck();
      },
    });
  }

  resetFilters(): void {
    this.fromControl.setValue(null);
    this.toControl.setValue(null);
    this.currentPage = 0;
    this.loadData();
  }

  onPage(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.currentSize = event.pageSize;
    this.loadData();
  }

  onCogeSelected(event: MatAutocompleteSelectedEvent): void {
    const conto = event.option.value as PianoContiCogeDTO;
    this.quickForm.controls.contoCoge.setValue(conto.id);
    this.cogeSearch.setValue(`${conto.nome} (${conto.codice})`, { emitEvent: false });
  }

  clearCoge(): void {
    this.quickForm.controls.contoCoge.setValue(null);
    this.cogeSearch.setValue('');
  }

  submitQuickForm(): void {
    if (this.quickForm.invalid) {
      this.quickForm.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const v = this.quickForm.getRawValue();
    const body: CreateCassaMovimentoRequest = {
      tipo:           v.tipo,
      importo:        v.importo!,
      dataMovimento:  this.toIso(v.dataMovimento),
      descrizione:    v.descrizione,
      contoCoge:      v.contoCoge,
      businessUnitId: v.businessUnitId,
      contoBancaId:   v.contoBancaId,
    };
    this.cassaService.create(body).subscribe({
      next: () => {
        this.saving.set(false);
        this.snackBar.open('Movimento registrato', 'OK', { duration: 3000 });
        this.quickForm.patchValue({ importo: null, descrizione: null, dataMovimento: new Date(), businessUnitId: null, contoCoge: null });
        this.cogeSearch.setValue('', { emitEvent: false });
        this.quickForm.markAsPristine();
        this.loadSaldo();
        this.currentPage = 0;
        this.loadData();
        this.cdr.markForCheck();
      },
      error: () => {
        this.saving.set(false);
        this.snackBar.open('Errore durante la registrazione', 'OK', { duration: 3000 });
        this.cdr.markForCheck();
      },
    });
  }

  openEdit(mov: CassaMovimentoDTO, event: Event): void {
    event.stopPropagation();
    import('./cassa-edit-dialog.component')
      .then(m => {
        this.dialog.open(m.CassaEditDialogComponent, {
          width: '500px',
          data: { movimento: mov, contiBancari: this.contiBancari() },
        }).afterClosed().subscribe(updated => {
          if (updated) {
            this.loadSaldo();
            this.loadData();
          }
        });
      })
      .catch(() => this.snackBar.open('Errore nel caricamento del dialogo', 'OK', { duration: 3000 }));
  }

  deleteMovimento(mov: CassaMovimentoDTO, event: Event): void {
    event.stopPropagation();
    this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Elimina movimento cassa',
        message: `Eliminare il movimento del ${this.formatDate(mov.dataMovimento)}?`,
        confirmLabel: 'Elimina',
        danger: true,
      },
    }).afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.cassaService.delete(mov.id).subscribe({
        next: () => {
          this.snackBar.open('Movimento eliminato', 'OK', { duration: 3000 });
          this.loadSaldo();
          this.loadData();
        },
        error: () => this.snackBar.open('Errore durante l\'eliminazione', 'OK', { duration: 3000 }),
      });
    });
  }

  tipoColor(tipo: string): string {
    return tipo === 'VERSAMENTO_IN_BANCA' ? '#2E7D32' : '#C62828';
  }

  tipoLabel(tipo: string): string {
    const map: Record<string, string> = {
      VERSAMENTO_IN_BANCA: 'Versamento',
      PRELIEVO_DA_BANCA: 'Prelievo',
    };
    return map[tipo] ?? tipo;
  }

  statoColor(stato: string): string {
    const map: Record<string, string> = {
      ATTIVO:        '#2E7D32',
      ANNULLATO:     '#C62828',
      RICONCILIATO:  '#1565C0',
    };
    return map[stato] ?? '#6B7280';
  }

  contoNome(id: number | null): string {
    if (id == null) return '—';
    return this.contiMap().get(id) ?? `Conto #${id}`;
  }

  formatDate(str: string | null): string {
    if (!str) return '—';
    const [y, m, d] = str.split('-');
    return `${d}/${m}/${y}`;
  }

  private toIso(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
