import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  inject,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { FornitoriService } from '../../../core/services/fornitori.service';
import { BuService } from '../../../core/services/bu.service';
import { FornitoreSummaryDTO } from '../../../core/models/anagrafica.models';
import { BusinessUnitDTO } from '../../../core/models/anagrafica.models';
import { PagedResponse } from '../../../core/models/shared.models';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-fornitori',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    BadgeComponent,
    EmptyStateComponent,
    SkeletonLoaderComponent,
  ],
  templateUrl: './fornitori.component.html',
  styleUrls: ['./fornitori.component.scss'],
})
export class FornitoriComponent implements OnInit, OnDestroy {
  private readonly fornitoriService = inject(FornitoriService);
  private readonly buService = inject(BuService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  readonly displayedColumns = ['ragioneSociale', 'alias', 'piva', 'buDefault', 'nAlias', 'azioni'];

  result = signal<PagedResponse<FornitoreSummaryDTO> | null>(null);
  loading = signal(false);
  buMap = signal<Map<number, BusinessUnitDTO>>(new Map());

  readonly searchControl = new FormControl<string>('', { nonNullable: true });

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
    const search = this.searchControl.value.trim();
    this.fornitoriService.getList({
      search: search || undefined,
      page: this.currentPage,
      size: this.currentSize,
    }).subscribe({
      next: res => {
        this.result.set(res);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Errore nel caricamento fornitori', 'OK', { duration: 3000 });
        this.cdr.markForCheck();
      },
    });
  }

  onPage(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.currentSize = event.pageSize;
    this.loadData();
  }

  openDetail(fornitore: FornitoreSummaryDTO): void {
    import('./fornitore-detail-dialog.component').then(m => {
      this.dialog.open(m.FornitoreDetailDialogComponent, {
        width: '640px',
        maxHeight: '90vh',
        data: { fornitoreId: fornitore.id },
      });
    });
  }

  openEdit(fornitore: FornitoreSummaryDTO, event: Event): void {
    event.stopPropagation();
    import('./fornitore-form-dialog.component').then(m => {
      this.dialog.open(m.FornitoreFormDialogComponent, {
        width: '560px',
        data: { fornitoreId: fornitore.id },
      }).afterClosed().subscribe(saved => {
        if (saved) this.loadData();
      });
    });
  }

  openCreate(): void {
    import('./fornitore-form-dialog.component').then(m => {
      this.dialog.open(m.FornitoreFormDialogComponent, {
        width: '560px',
        data: {},
      }).afterClosed().subscribe(saved => {
        if (saved) this.loadData();
      });
    });
  }

  deleteFornitore(fornitore: FornitoreSummaryDTO, event: Event): void {
    event.stopPropagation();
    this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Elimina fornitore',
        message: `Eliminare "${fornitore.ragioneSociale}"?`,
        confirmLabel: 'Elimina',
        danger: true,
      },
    }).afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.snackBar.open('Funzionalità non ancora disponibile', 'OK', { duration: 3000 });
    });
  }

  buNome(id: number | null): string {
    if (id == null) return '—';
    return this.buMap().get(id)?.nome ?? `BU#${id}`;
  }

  buColore(id: number | null): string {
    if (id == null) return '#6B7280';
    return this.buMap().get(id)?.colore ?? '#6B7280';
  }
}
