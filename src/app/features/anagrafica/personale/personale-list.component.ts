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
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { DecimalPipe } from '@angular/common';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { PersonaleService } from '../../../core/services/personale.service';
import { BuService } from '../../../core/services/bu.service';
import {
  PersonaleSummaryDTO,
  PersonaleCostoSummaryDTO,
  BusinessUnitDTO,
} from '../../../core/models';
import { PagedResponse } from '../../../core/models/shared.models';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader.component';

@Component({
  selector: 'app-personale-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    DecimalPipe,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatSlideToggleModule,
    BadgeComponent,
    EmptyStateComponent,
    SkeletonLoaderComponent,
  ],
  templateUrl: './personale-list.component.html',
  styleUrls: ['./personale-list.component.scss'],
})
export class PersonaleListComponent implements OnInit, OnDestroy {
  private readonly service = inject(PersonaleService);
  private readonly buService = inject(BuService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  readonly displayedColumns = ['nome', 'mansione', 'bu', 'costo', 'stato', 'azioni'];

  result = signal<PagedResponse<PersonaleSummaryDTO> | null>(null);
  summary = signal<PersonaleCostoSummaryDTO | null>(null);
  loading = signal(false);
  mansioni = signal<string[]>([]);
  buList = signal<BusinessUnitDTO[]>([]);

  readonly searchControl = new FormControl<string>('', { nonNullable: true });
  readonly buControl = new FormControl<number | null>(null);
  readonly mansioneControl = new FormControl<string | null>(null);
  readonly activeOnlyControl = new FormControl<boolean>(false, { nonNullable: true });

  private currentPage = 0;
  private currentSize = 20;

  ngOnInit(): void {
    this.buService.getAll().subscribe(units => {
      this.buList.set(units);
      this.cdr.markForCheck();
    });

    this.service.getMansioni().subscribe(m => {
      this.mansioni.set(m);
      this.cdr.markForCheck();
    });

    this.loadSummary();

    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe(() => { this.currentPage = 0; this.loadData(); });

    this.buControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.currentPage = 0; this.loadData();
    });

    this.mansioneControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.currentPage = 0; this.loadData();
    });

    this.activeOnlyControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.currentPage = 0; this.loadData();
    });

    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData(): void {
    this.loading.set(true);
    this.service.getList({
      search: this.searchControl.value.trim() || undefined,
      buId: this.buControl.value ?? undefined,
      mansione: this.mansioneControl.value ?? undefined,
      activeOnly: this.activeOnlyControl.value || undefined,
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
        this.snackBar.open('Errore nel caricamento dipendenti', 'OK', { duration: 3000 });
        this.cdr.markForCheck();
      },
    });
  }

  loadSummary(): void {
    this.service.getCostoSummary().subscribe({
      next: s => { this.summary.set(s); this.cdr.markForCheck(); },
      error: () => {},
    });
  }

  onPage(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.currentSize = event.pageSize;
    this.loadData();
  }

  openCreate(): void {
    import('./personale-form-dialog.component').then(m => {
      this.dialog.open(m.PersonaleFormDialogComponent, {
        width: '560px',
        data: {},
      }).afterClosed().subscribe(saved => {
        if (saved) { this.loadData(); this.loadSummary(); }
      });
    });
  }

  openEdit(p: PersonaleSummaryDTO, event: Event): void {
    event.stopPropagation();
    import('./personale-form-dialog.component').then(m => {
      this.dialog.open(m.PersonaleFormDialogComponent, {
        width: '560px',
        data: { personaleId: p.id },
      }).afterClosed().subscribe(saved => {
        if (saved) { this.loadData(); this.loadSummary(); }
      });
    });
  }

  buNome(id: number | null): string {
    if (id == null) return '—';
    return this.buList().find(b => b.id === id)?.nome ?? `BU#${id}`;
  }

  buColore(id: number | null): string {
    if (id == null) return '#6B7280';
    return this.buList().find(b => b.id === id)?.colore ?? '#6B7280';
  }
}
