import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { interval, of, Subject } from 'rxjs';
import { catchError, distinctUntilChanged, switchMap, takeUntil, takeWhile } from 'rxjs/operators';
import { BaseChartDirective } from 'ng2-charts';
import type { ChartData, ChartOptions } from 'chart.js';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';

import { BuService } from '../../core/services/bu.service';
import { ReportingService } from '../../core/services/reporting.service';
import { PlDTO, VoceDTO } from '../../core/models/reporting.models';
import { BusinessUnitDTO } from '../../core/models/anagrafica.models';
import { DashboardPeriod } from '../../core/models/dashboard.models';
import {
  DateRangePickerComponent,
  PeriodChangeEvent,
} from '../../shared/components/date-range-picker/date-range-picker.component';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { EuroPipe } from '../../shared/pipes/euro.pipe';

const DONUT_COLORS = [
  '#1F5C43', '#40916C', '#74C69D', '#95D5B2', '#1B4332',
  '#B5894B', '#E65100', '#F4A261', '#E76F51', '#264653',
];

@Component({
  selector: 'app-bu',
  standalone: true,
  imports: [
    BaseChartDirective,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTableModule,
    DateRangePickerComponent,
    StatCardComponent,
    SkeletonLoaderComponent,
    EuroPipe,
  ],
  templateUrl: './bu.component.html',
  styleUrls: ['./bu.component.scss'],
})
export class BuComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly buSvc = inject(BuService);
  private readonly reportingSvc = inject(ReportingService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly snackBar = inject(MatSnackBar);
  private readonly pollStop$ = new Subject<void>();
  private readonly cancelPl$ = new Subject<void>();

  readonly bu = signal<BusinessUnitDTO | null>(null);
  readonly buId = signal<number | null>(null);
  readonly period = signal<{ from: string; to: string }>(this.ytdRange());
  readonly selectedPeriod = signal<DashboardPeriod>('YTD');
  readonly plData = signal<PlDTO | null>(null);
  readonly plLoading = signal(false);
  readonly jobId = signal<string | null>(null);
  readonly plError = signal<string | null>(null);
  readonly downloading = signal(false);

  readonly ricaviColumns = ['categoria', 'codiceCoge', 'importo', 'pct'];
  readonly costiColumns = ['categoria', 'codiceCoge', 'importo', 'pct'];

  readonly donutData = computed<ChartData<'doughnut'>>(() => {
    const pl = this.plData();
    if (!pl?.ricavi.perCategoria.length) return { datasets: [], labels: [] };
    const cats = [...pl.ricavi.perCategoria].sort((a, b) => b.importo - a.importo);
    return {
      labels: cats.map(c => c.categoria),
      datasets: [{
        data: cats.map(c => c.importo),
        backgroundColor: DONUT_COLORS.slice(0, cats.length),
        borderWidth: 2,
        borderColor: '#fff',
      }],
    };
  });

  readonly donutOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: {
      legend: { position: 'bottom', labels: { font: { size: 12 }, padding: 16 } },
      tooltip: {
        callbacks: {
          label: ctx => {
            const val = ctx.parsed ?? 0;
            const total = (ctx.dataset.data as number[]).reduce((a, b) => a + (b as number), 0);
            const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0';
            return ` ${ctx.label}: ${new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val)} (${pct}%)`;
          },
        },
      },
    },
  };

  get ebitdaColor(): 'success' | 'danger' {
    return (this.plData()?.ebitda ?? 0) >= 0 ? 'success' : 'danger';
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(
      distinctUntilChanged((a, b) => a.get('buId') === b.get('buId')),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(params => {
      const idStr = params.get('buId');
      const id = idStr ? parseInt(idStr, 10) : null;
      if (!id) return;
      this.buId.set(id);
      this.period.set(this.ytdRange());
      this.selectedPeriod.set('YTD');
      this.buSvc.getById(id).pipe(
        takeUntilDestroyed(this.destroyRef),
      ).subscribe(bu => this.bu.set(bu ?? null));
      this.loadPl();
    });
  }

  onPeriodChange(evt: PeriodChangeEvent): void {
    this.period.set(this.periodToRange(evt));
    this.selectedPeriod.set(evt.period);
    this.loadPl();
  }

  loadPl(): void {
    const id = this.buId();
    if (!id) return;
    const { from, to } = this.period();
    this.pollStop$.next();
    this.cancelPl$.next();
    this.plLoading.set(true);
    this.plData.set(null);
    this.jobId.set(null);
    this.plError.set(null);

    this.reportingSvc.getPl(id, from, to)
      .pipe(
        catchError(() => {
          this.plError.set('Errore nel caricamento del P&L');
          this.plLoading.set(false);
          return of(null);
        }),
        takeUntil(this.cancelPl$),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(res => {
        if (!res) return;
        if ('jobId' in res) {
          this.jobId.set(res.jobId);
          this.startPolling(res.jobId);
        } else {
          this.plData.set(res as PlDTO);
          this.plLoading.set(false);
        }
      });
  }

  startPolling(jobId: string): void {
    interval(2500).pipe(
      switchMap(() => this.reportingSvc.getPlStatus(jobId)),
      takeWhile(s => s.status !== 'COMPLETED' && s.status !== 'FAILED', true),
      takeUntil(this.pollStop$),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(s => {
      if (s.status === 'COMPLETED' && s.result) {
        this.plData.set(s.result);
        this.plLoading.set(false);
        this.jobId.set(null);
      } else if (s.status === 'FAILED') {
        this.plError.set(s.error ?? 'Calcolo P&L fallito');
        this.plLoading.set(false);
        this.jobId.set(null);
      }
    });
  }

  exportPl(): void {
    const id = this.buId();
    if (!id) return;
    const { from, to } = this.period();
    this.downloading.set(true);
    this.reportingSvc.exportPlBu(id, from, to)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: blob => {
          this.reportingSvc.downloadBlob(blob, `pl-bu${id}-${from}_${to}.xlsx`);
          this.downloading.set(false);
        },
        error: () => {
          this.snackBar.open('Errore durante il download', 'OK', { duration: 3000 });
          this.downloading.set(false);
        },
      });
  }

  sortedRicavi(): VoceDTO[] {
    return [...(this.plData()?.ricavi.perCategoria ?? [])].sort((a, b) => b.importo - a.importo);
  }

  sortedCosti(): VoceDTO[] {
    return [...(this.plData()?.costi.perCategoria ?? [])].sort((a, b) => b.importo - a.importo);
  }

  private periodToRange(evt: PeriodChangeEvent): { from: string; to: string } {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    switch (evt.period) {
      case 'MTD':
        return {
          from: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`,
          to: todayStr,
        };
      case 'QTD': {
        const q = Math.floor(today.getMonth() / 3);
        return { from: new Date(today.getFullYear(), q * 3, 1).toISOString().slice(0, 10), to: todayStr };
      }
      case 'YTD':
        return { from: `${today.getFullYear()}-01-01`, to: todayStr };
      default:
        return { from: evt.from!, to: evt.to! };
    }
  }

  private ytdRange(): { from: string; to: string } {
    const today = new Date();
    return { from: `${today.getFullYear()}-01-01`, to: today.toISOString().slice(0, 10) };
  }
}
