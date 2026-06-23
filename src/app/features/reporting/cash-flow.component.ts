import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { BaseChartDirective } from 'ng2-charts';
import type { ChartData, ChartOptions } from 'chart.js';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';

import { ReportingService } from '../../core/services/reporting.service';
import { DataRefreshService } from '../../core/services/data-refresh.service';
import { CashFlowPeriodoDTO, ForecastPointDTO } from '../../core/models/reporting.models';
import { DashboardPeriod } from '../../core/models/dashboard.models';
import {
  DateRangePickerComponent,
  PeriodChangeEvent,
} from '../../shared/components/date-range-picker/date-range-picker.component';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { HelpNoteComponent } from '../../shared/components/help-note/help-note.component';
import { EuroPipe } from '../../shared/pipes/euro.pipe';

@Component({
  selector: 'app-cash-flow',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    BaseChartDirective,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTableModule,
    DateRangePickerComponent,
    SkeletonLoaderComponent,
    HelpNoteComponent,
    EuroPipe,
  ],
  templateUrl: './cash-flow.component.html',
  styleUrls: ['./cash-flow.component.scss'],
})
export class CashFlowComponent implements OnInit {
  private readonly reportingSvc = inject(ReportingService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dataRefresh = inject(DataRefreshService);

  // — Storico —
  readonly period = signal<{ from: string; to: string }>(this.ytdRange());
  readonly selectedPeriod = signal<DashboardPeriod>('YTD');
  readonly granularita = new FormControl<string>('MONTH', { nonNullable: true });
  readonly storicoData = signal<CashFlowPeriodoDTO[]>([]);
  readonly storicoLoading = signal(false);
  readonly storicoError = signal<string | null>(null);
  readonly storicoColumns = ['periodo', 'entrate', 'uscite', 'saldoPeriodo', 'saldoCumulato'];

  // — Forecast —
  readonly forecastGiorni = new FormControl<number>(90, { nonNullable: true });
  readonly forecastData = signal<ForecastPointDTO[]>([]);
  readonly forecastLoading = signal(false);
  readonly forecastError = signal<string | null>(null);
  readonly forecastColumns = ['data', 'tipo', 'entratePreviste', 'uscitePreviste', 'liquiditaProiettata', 'note'];

  readonly storicoChartData = computed<ChartData<'line'>>(() => {
    const rows = this.storicoData();
    return {
      labels: rows.map(r => r.periodoInizio.slice(0, 7)),
      datasets: [
        {
          label: 'Entrate',
          data: rows.map(r => r.entrate),
          borderColor: '#2E7D32',
          backgroundColor: 'rgba(46,125,50,0.25)',
          fill: true,
          tension: 0.3,
          pointRadius: 3,
        },
        {
          label: 'Uscite',
          data: rows.map(r => r.uscite),
          borderColor: '#C62828',
          backgroundColor: 'rgba(198,40,40,0.25)',
          fill: true,
          tension: 0.3,
          pointRadius: 3,
        },
        {
          label: 'Saldo Cumulato',
          data: rows.map(r => r.saldoCumulato),
          borderColor: '#2C6E8F',
          backgroundColor: 'transparent',
          borderDash: [6, 3],
          fill: false,
          tension: 0.3,
          pointRadius: 3,
          yAxisID: 'y2',
        },
      ],
    };
  });

  readonly storicoChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'top' },
      tooltip: {
        callbacks: {
          label: ctx => {
            const val = ctx.parsed.y ?? 0;
            return ` ${ctx.dataset.label}: ${new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val)}`;
          },
        },
      },
    },
    scales: {
      y: {
        position: 'left',
        ticks: {
          callback: v => {
            const n = Number(v);
            return n >= 1000 ? `€ ${(n / 1000).toFixed(0)}k` : `€ ${n}`;
          },
        },
      },
      y2: {
        position: 'right',
        grid: { drawOnChartArea: false },
        ticks: {
          callback: v => {
            const n = Number(v);
            return n >= 1000 ? `€ ${(n / 1000).toFixed(0)}k` : `€ ${n}`;
          },
        },
      },
    },
  };

  readonly forecastChartData = computed<ChartData<'line'>>(() => {
    const rows = this.forecastData();
    return {
      labels: rows.map(r => r.data.slice(0, 10)),
      datasets: [{
        label: 'Liquidità Proiettata',
        data: rows.map(r => r.liquiditaProiettata),
        borderColor: '#2C6E8F',
        backgroundColor: 'rgba(21,101,192,0.08)',
        borderDash: [8, 4],
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: rows.map(r =>
          r.tipo === 'SCADENZA_EVENTO' ? '#E65100' : '#9E9E9E'
        ),
      }],
    };
  });

  readonly forecastChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      tooltip: {
        callbacks: {
          label: ctx => {
            const val = ctx.parsed.y ?? 0;
            return ` Liquidità: ${new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val)}`;
          },
        },
      },
    },
    scales: {
      y: {
        ticks: {
          callback: v => {
            const n = Number(v);
            return n >= 1000 ? `€ ${(n / 1000).toFixed(0)}k` : `€ ${n}`;
          },
        },
      },
    },
  };

  ngOnInit(): void {
    this.loadStorico();
    this.loadForecast();
    // Auto-refresh dopo mutation in altre pagine (interceptor → DataRefreshService).
    this.dataRefresh.dashboardRefresh$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.loadStorico();
        this.loadForecast();
      });
  }

  onPeriodChange(evt: PeriodChangeEvent): void {
    this.period.set(this.periodToRange(evt));
    this.selectedPeriod.set(evt.period);
    this.loadStorico();
  }

  loadStorico(): void {
    const { from, to } = this.period();
    this.storicoLoading.set(true);
    this.storicoError.set(null);
    this.reportingSvc.getCashFlowStorico(from, to, this.granularita.value)
      .pipe(
        catchError(() => {
          this.storicoError.set('Errore nel caricamento del cash flow storico');
          this.storicoLoading.set(false);
          return of([]);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(data => {
        this.storicoData.set(data);
        this.storicoLoading.set(false);
      });
  }

  loadForecast(): void {
    this.forecastLoading.set(true);
    this.forecastError.set(null);
    this.reportingSvc.getCashFlowForecast(this.forecastGiorni.value)
      .pipe(
        catchError(() => {
          this.forecastError.set('Errore nel caricamento della previsione');
          this.forecastLoading.set(false);
          return of([]);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(data => {
        this.forecastData.set(data);
        this.forecastLoading.set(false);
      });
  }

  formatDate(str: string): string {
    if (!str) return '—';
    const parts = str.slice(0, 10).split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : str.slice(0, 10);
  }

  tipoLabel(tipo: string): string {
    const map: Record<string, string> = {
      SCADENZA_EVENTO: 'Scadenza Evento',
      MEDIA_STORICA: 'Media Storica',
    };
    return map[tipo] ?? tipo;
  }

  tipoColor(tipo: string): string {
    return tipo === 'SCADENZA_EVENTO' ? '#E65100' : '#9E9E9E';
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
