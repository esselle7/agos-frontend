import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  inject,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { MovimentiService, MovimentiFilter } from '../../core/services/movimenti.service';
import { ReportingService } from '../../core/services/reporting.service';
import { AuthService } from '../../core/auth/auth.service';
import { BuService } from '../../core/services/bu.service';
import { MovimentoDTO, MovimentiSommarioDTO, TipoMovimento, StatoMovimento } from '../../core/models/movimenti.models';
import { BusinessUnitDTO } from '../../core/models/anagrafica.models';
import { PagedResponse } from '../../core/models/shared.models';
import { EuroPipe } from '../../shared/pipes/euro.pipe';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { RiconciliazioneDialogComponent } from './riconciliazione-dialog.component';
import { ImportDialogComponent } from './import-dialog.component';

@Component({
  selector: 'app-movimenti-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressBarModule,
    EuroPipe,
    BadgeComponent,
    EmptyStateComponent,
    SkeletonLoaderComponent,
  ],
  templateUrl: './movimenti-list.component.html',
  styleUrls: ['./movimenti-list.component.scss'],
})
export class MovimentiListComponent implements OnInit, OnDestroy {
  private readonly movimentiService = inject(MovimentiService);
  private readonly reportingService = inject(ReportingService);
  private readonly buService = inject(BuService);
  readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  readonly displayedColumns = ['dataMovimento', 'tipo', 'descrizione', 'bu', 'fonte', 'importo', 'stato', 'azioni'];

  result = signal<PagedResponse<MovimentoDTO> | null>(null);
  sommario = signal<MovimentiSommarioDTO | null>(null);
  loading = signal(false);
  buMap = signal<Map<number, BusinessUnitDTO>>(new Map());

  // Filter controls
  readonly searchControl = new FormControl<string>('', { nonNullable: true });
  readonly tipoControl = new FormControl<string>('', { nonNullable: true });
  readonly buControl = new FormControl<number | null>(null);
  readonly statoControl = new FormControl<string>('', { nonNullable: true });
  readonly fromControl = new FormControl<Date | null>(null);
  readonly toControl = new FormControl<Date | null>(null);

  private currentPage = 0;
  private currentSize = 20;

  ngOnInit(): void {
    this.buService.getAll().subscribe(units => {
      this.buMap.set(new Map(units.map(u => [u.id, u])));
      this.cdr.markForCheck();
    });

    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe(() => {
      this.currentPage = 0;
      this.loadData();
    });

    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData(): void {
    this.loading.set(true);
    const baseFilter = this.buildFilter();
    const listFilter: MovimentiFilter = { ...baseFilter, page: this.currentPage, size: this.currentSize, sort: 'dataMovimento,desc' };

    this.movimentiService.getList(listFilter).subscribe({
      next: res => {
        this.result.set(res);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Errore nel caricamento dei movimenti', 'OK', { duration: 3000 });
        this.cdr.markForCheck();
      },
    });

    this.movimentiService.getSommario(baseFilter).subscribe({
      next: s => { this.sommario.set(s); this.cdr.markForCheck(); },
      error: () => {},
    });
  }

  private buildFilter(): MovimentiFilter {
    const filter: MovimentiFilter = {};
    const search = this.searchControl.value.trim();
    if (search) filter.search = search;
    const tipo = this.tipoControl.value;
    if (tipo === 'ENTRATA' || tipo === 'USCITA') filter.tipo = tipo;
    const buId = this.buControl.value;
    if (buId != null) filter.buId = buId;
    const stato = this.statoControl.value;
    if (stato) filter.stato = stato;
    const from = this.fromControl.value;
    if (from) filter.from = this.toIso(from);
    const to = this.toControl.value;
    if (to) filter.to = this.toIso(to);
    return filter;
  }

  resetFilters(): void {
    this.searchControl.setValue('');
    this.tipoControl.setValue('');
    this.buControl.setValue(null);
    this.statoControl.setValue('');
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

  onRowClick(row: MovimentoDTO): void {
    this.router.navigate(['/movimenti', row.id]);
  }

  openRiconciliazione(): void {
    this.dialog.open(RiconciliazioneDialogComponent, { width: '800px', maxHeight: '90vh' });
  }

  openImport(): void {
    this.dialog.open(ImportDialogComponent, { width: '600px' }).afterClosed().subscribe(imported => {
      if (imported) this.loadData();
    });
  }

  esportaCsv(): void {
    const from = this.fromControl.value;
    const to = this.toControl.value;
    const today = new Date();
    const fromStr = from ? this.toIso(from) : this.toIso(new Date(today.getFullYear(), today.getMonth(), 1));
    const toStr = to ? this.toIso(to) : this.toIso(today);
    this.reportingService.exportMovimenti(fromStr, toStr, 'csv').subscribe(blob => {
      this.reportingService.downloadBlob(blob, `movimenti-${fromStr}.csv`);
    });
  }

  deleteMovimento(mov: MovimentoDTO, event: Event): void {
    event.stopPropagation();
    this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Elimina movimento',
        message: `Eliminare il movimento "${mov.descrizione}"?`,
        confirmLabel: 'Elimina',
        danger: true,
      },
    }).afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.movimentiService.delete(mov.id).subscribe({
        next: () => {
          this.snackBar.open('Movimento eliminato', 'OK', { duration: 3000 });
          this.loadData();
        },
        error: () => this.snackBar.open('Errore durante l\'eliminazione', 'OK', { duration: 3000 }),
      });
    });
  }

  formatDate(str: string | null): string {
    if (!str) return '—';
    const [y, m, d] = str.split('-');
    return `${d}/${m}/${y}`;
  }

  truncate(str: string, len = 40): string {
    return str.length > len ? str.slice(0, len) + '…' : str;
  }

  tipoColor(tipo: TipoMovimento): string {
    return tipo === 'ENTRATA' ? '#2E7D32' : '#C62828';
  }

  statoColor(stato: StatoMovimento): string {
    const map: Record<StatoMovimento, string> = {
      REGISTRATO:   '#1565C0',
      DA_LIQUIDARE: '#F57C00',
      ANNULLATO:    '#C62828',
      RICONCILIATO: '#2E7D32',
    };
    return map[stato] ?? '#6B7280';
  }

  statoLabel(stato: string): string {
    const map: Record<string, string> = {
      REGISTRATO:   'Registrato',
      DA_LIQUIDARE: 'Da liquidare',
      ANNULLATO:    'Annullato',
      RICONCILIATO: 'Riconciliato',
    };
    return map[stato] ?? stato;
  }

  sommarioCount(s: { countEntrate: number; countUscite: number }): number {
    return s.countEntrate + s.countUscite;
  }

  fonteColor(fonte: string | null): string {
    const map: Record<string, string> = {
      MANUALE:    '#6B7280',
      IMPORT_CSV: '#3182CE',
      STRIPE:     '#6772E5',
      SATISPAY:   '#FF466C',
      SHOPIFY:    '#95BF47',
      BILLY:      '#DD6B20',
    };
    return fonte ? (map[fonte] ?? '#6B7280') : '#6B7280';
  }

  buNome(buId: number): string {
    return this.buMap().get(buId)?.nome ?? `BU#${buId}`;
  }

  buColore(buId: number): string {
    return this.buMap().get(buId)?.colore ?? '#6B7280';
  }

  private toIso(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
