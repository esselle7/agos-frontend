import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BaseChartDirective } from 'ng2-charts';
import type { ChartData, ChartOptions } from 'chart.js';

import { DashboardService } from '../../core/services/dashboard.service';
import { DataRefreshService } from '../../core/services/data-refresh.service';
import { GlobalPeriodService } from '../../core/services/global-period.service';
import { MovimentiService } from '../../core/services/movimenti.service';
import { ContiService } from '../../core/services/conti.service';
import { ContoBancarioDTO } from '../../core/models/anagrafica.models';
import {
  DashboardKpiDTO,
  AndamentoMensileDTO,
  FatturatoPerBuDTO,
  ScadenzaDTO,
  ScadenzeImminentiDTO,
  UscitaDaLiquidareDTO,
} from '../../core/models/dashboard.models';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { EuroPipe } from '../../shared/pipes/euro.pipe';
import { DateRangePickerComponent, PeriodChangeEvent } from '../../shared/components/date-range-picker/date-range-picker.component';

const MESI =['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    BaseChartDirective,
    StatCardComponent,
    SkeletonLoaderComponent,
    EmptyStateComponent,
    EuroPipe,
    DateRangePickerComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  private readonly dashboardSvc = inject(DashboardService);
  readonly globalPeriod = inject(GlobalPeriodService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dataRefresh = inject(DataRefreshService);
  private readonly movimentiSvc = inject(MovimentiService);
  private readonly contiSvc = inject(ContiService);
  private readonly snackBar = inject(MatSnackBar);

  readonly kpi = signal<DashboardKpiDTO | null>(null);
  readonly andamento = signal<AndamentoMensileDTO[]>([]);
  readonly fatturatoPerBu = signal<FatturatoPerBuDTO[]>([]);
  readonly scadenzeEventi       = signal<ScadenzaDTO[]>([]);
  readonly scadenzeRate         = signal<ScadenzaDTO[]>([]);
  readonly usciteDaLiquidare    = signal<UscitaDaLiquidareDTO[]>([]);
  readonly loading = signal(true);
  readonly loadingPeriod = signal(false);
  readonly liquidandoId = signal<string | null>(null);
  readonly conti = signal<ContoBancarioDTO[]>([]);

  kpiError = false;
  andamentoError = false;
  fatturatoError = false;
  scadenzeError = false;

  private _initialized = false;

  readonly lineChartData = computed<ChartData<'line'>>(() => {
    const rows = this.andamento();
    return {
      labels: rows.map(r => `${MESI[r.mese - 1]} ${String(r.anno).slice(2)}`),
      datasets: [
        {
          label: 'Entrate',
          data: rows.map(r => r.totEntrate),
          borderColor: '#2E7D32',
          backgroundColor: 'rgba(46, 125, 50, 0.08)',
          tension: 0.3,
          fill: true,
          pointRadius: 3,
        },
        {
          label: 'Uscite',
          data: rows.map(r => r.totUscite),
          borderColor: '#C62828',
          backgroundColor: 'rgba(198, 40, 40, 0.08)',
          tension: 0.3,
          fill: true,
          pointRadius: 3,
        },
      ],
    };
  });

  readonly buChartData = computed<ChartData<'bar'>>(() => {
    const rows = this.fatturatoPerBu();
    return {
      labels: rows.map(r => r.buNome),
      datasets: [
        {
          label: 'Entrate',
          data: rows.map(r => r.totEntrate),
          backgroundColor: rows.map(r => r.colore + 'BB'),
          borderColor: rows.map(r => r.colore),
          borderWidth: 1,
        },
        {
          label: 'Uscite',
          data: rows.map(r => r.totUscite),
          backgroundColor: 'rgba(198, 40, 40, 0.45)',
          borderColor: '#C62828',
          borderWidth: 1,
        },
      ],
    };
  });

  readonly eventiByUrgenza = computed(() => {
    const items = this.scadenzeEventi().filter(s => s.stato !== 'PAID');
    return {
      alta:  items.filter(s => s.urgenza === 'ALTA').length,
      media: items.filter(s => s.urgenza === 'MEDIA').length,
    };
  });

  readonly rateByUrgenza = computed(() => {
    const items = this.scadenzeRate().filter(s => s.stato !== 'PAID');
    return {
      alta:  items.filter(s => s.urgenza === 'ALTA').length,
      media: items.filter(s => s.urgenza === 'MEDIA').length,
    };
  });

  readonly totalePendingEventi = computed(() =>
    this.scadenzeEventi()
      .filter(s => s.stato !== 'PAID')
      .reduce((sum, s) => sum + (s.importoAtteso ?? 0), 0)
  );

  readonly totalePendingRate = computed(() =>
    this.scadenzeRate()
      .filter(s => s.stato !== 'PAID')
      .reduce((sum, s) => sum + (s.importoAtteso ?? 0), 0)
  );

  readonly totaleUsciteDaLiquidare = computed(() =>
    this.usciteDaLiquidare().reduce((sum, u) => sum + (u.importo ?? 0), 0)
  );

  readonly usciteScadute = computed(() =>
    this.usciteDaLiquidare().filter(u => u.urgenza === 'SCADUTA')
  );

  readonly lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'top', labels: { font: { size: 12 } } },
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
        ticks: {
          callback: value => {
            const n = Number(value);
            if (n >= 1_000_000) return `€ ${(n / 1_000_000).toFixed(1)}M`;
            if (n >= 1_000) return `€ ${(n / 1_000).toFixed(0)}k`;
            return `€ ${n}`;
          },
        },
      },
    },
  };

  readonly buChartOptions: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { font: { size: 12 } } },
      tooltip: {
        callbacks: {
          label: ctx => {
            const val = ctx.parsed.x ?? 0;
            return ` ${ctx.dataset.label}: ${new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val)}`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          callback: value => {
            const n = Number(value);
            if (n >= 1_000_000) return `€ ${(n / 1_000_000).toFixed(1)}M`;
            if (n >= 1_000) return `€ ${(n / 1_000).toFixed(0)}k`;
            return `€ ${n}`;
          },
        },
      },
    },
  };

  readonly variazioneSaldiLabel = computed(() => {
    switch (this.globalPeriod.period()) {
      case 'MTD':    return 'vs mese prec.';
      case 'QTD':    return 'vs trimestre prec.';
      case 'YTD':    return 'vs anno prec.';
      default:       return 'vs periodo prec.';
    }
  });

  readonly deltaKpiLabel = computed(() => {
    switch (this.globalPeriod.period()) {
      case 'MTD':    return 'vs mese prec.';
      case 'QTD':    return 'vs trimestre prec.';
      case 'YTD':    return 'vs anno prec.';
      default:       return 'vs periodo prec.';
    }
  });

  readonly periodoLabel = computed(() => {
    const p = this.globalPeriod.period();
    const from = this.globalPeriod.from();
    const to   = this.globalPeriod.to();
    if (p === 'CUSTOM' && from && to) {
      return `dal ${this.formatDate(from)} al ${this.formatDate(to)}`;
    }
    const kpi = this.kpi();
    if (kpi?.periodo) {
      return `dal ${this.formatDate(kpi.periodo.from)} al ${this.formatDate(kpi.periodo.to)}`;
    }
    return '';
  });

  get margineColor(): 'success' | 'danger' | 'neutral' {
    const m = this.kpi()?.periodo?.margine ?? 0;
    if (m > 0) return 'success';
    if (m < 0) return 'danger';
    return 'neutral';
  }

  constructor() {
    effect(() => {
      const period = this.globalPeriod.period();
      const from = this.globalPeriod.from();
      const to = this.globalPeriod.to();
      if (!this._initialized) return;
      untracked(() => {
        this.loadingPeriod.set(true);
        this.kpiError = false;
        this.fatturatoError = false;
        this.scadenzeError = false;
        forkJoin({
          kpi: this.dashboardSvc
            .getKpi(period, from ?? undefined, to ?? undefined)
            .pipe(catchError(() => { this.kpiError = true; return of(null); })),
          fatturato: this.dashboardSvc
            .getFatturatoPerBu(period, from ?? undefined, to ?? undefined)
            .pipe(catchError(() => { this.fatturatoError = true; return of([]); })),
          scadenze: this.dashboardSvc
            .getScadenzeImminenti(period, from ?? undefined, to ?? undefined)
            .pipe(catchError(() => { this.scadenzeError = true; return of<ScadenzeImminentiDTO>({ eventi: [], rateRicorrenti: [], usciteDaLiquidare: [] }); })),
        })
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(res => {
            if (res.kpi) this.kpi.set(res.kpi);
            this.fatturatoPerBu.set(res.fatturato);
            this.scadenzeEventi.set(res.scadenze.eventi);
            this.scadenzeRate.set(res.scadenze.rateRicorrenti);
            this.usciteDaLiquidare.set(res.scadenze.usciteDaLiquidare ?? []);
            this.loadingPeriod.set(false);
          });
      });
    });

    // Dopo una mutation in qualunque pagina, l'interceptor `dataRefreshInterceptor`
    // invalida la cache `dashboard:*` e notifica qui per ri-fetchare i dati
    // senza F5. Il delay (DataRefreshService.refreshDelayMs) è già applicato
    // upstream per dare tempo al backend di rinfrescare le MV.
    this.dataRefresh.dashboardRefresh$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this._initialized) this.reloadAll();
      });
  }

  ngOnInit(): void {
    this.contiSvc.getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(list => this.conti.set(list));
    this.reloadAll();
  }

  private reloadAll(): void {
    const period = this.globalPeriod.period();
    const from = this.globalPeriod.from();
    const to = this.globalPeriod.to();
    this.kpiError = false;
    this.andamentoError = false;
    this.fatturatoError = false;
    this.scadenzeError = false;

    forkJoin({
      kpi: this.dashboardSvc
        .getKpi(period, from ?? undefined, to ?? undefined)
        .pipe(catchError(() => { this.kpiError = true; return of(null); })),
      andamento: this.dashboardSvc
        .getAndamentoMensile(2)
        .pipe(catchError(() => { this.andamentoError = true; return of([]); })),
      fatturato: this.dashboardSvc
        .getFatturatoPerBu(period, from ?? undefined, to ?? undefined)
        .pipe(catchError(() => { this.fatturatoError = true; return of([]); })),
      scadenze: this.dashboardSvc
        .getScadenzeImminenti(period, from ?? undefined, to ?? undefined)
        .pipe(catchError(() => { this.scadenzeError = true; return of<ScadenzeImminentiDTO>({ eventi: [], rateRicorrenti: [], usciteDaLiquidare: [] }); })),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(res => {
        if (res.kpi) this.kpi.set(res.kpi);
        this.andamento.set(res.andamento);
        this.fatturatoPerBu.set(res.fatturato);
        this.scadenzeEventi.set(res.scadenze.eventi);
        this.scadenzeRate.set(res.scadenze.rateRicorrenti);
        this.usciteDaLiquidare.set(res.scadenze.usciteDaLiquidare ?? []);
        this.loading.set(false);
        this._initialized = true;
      });
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  formatScadenzaDate(dateStr: string): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);
    if (diffDays < 0) return 'Scaduto';
    if (diffDays === 0) return 'Oggi';
    if (diffDays === 1) return 'Domani';
    if (diffDays <= 7) return `Tra ${diffDays} giorni`;
    return this.formatDate(dateStr);
  }

  getDayFromDate(dateStr: string): string {
    return dateStr?.split('-')[2] ?? '—';
  }

  getMonthFromDate(dateStr: string): string {
    const m = parseInt(dateStr?.split('-')[1] ?? '0', 10);
    return MESI[m - 1] ?? '';
  }

  onPeriodChange(evt: PeriodChangeEvent): void {
    this.globalPeriod.setPeriod(evt.period, evt.from, evt.to);
  }

  formatTimestamp(iso: string): string {
    if (!iso) return '';
    return iso.length >= 16 ? iso.slice(11, 16) : iso;
  }

  liquidaUscita(id: string, contoBancarioId: number): void {
    if (this.liquidandoId()) return;
    this.liquidandoId.set(id);
    this.movimentiSvc.liquida(id, contoBancarioId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          // Rimozione ottimistica dalla lista — la dashboard si aggiornerà
          // anche via dashboardRefresh$ una volta che le cache vengono invalidate
          this.usciteDaLiquidare.update(list => list.filter(u => u.id !== id));
          this.liquidandoId.set(null);
          this.snackBar.open('Movimento liquidato ✓', 'OK', { duration: 3000 });
        },
        error: () => {
          this.liquidandoId.set(null);
          this.snackBar.open('Errore durante la liquidazione', 'OK', { duration: 3000 });
        },
      });
  }

  contoIcon(tipo: string): string {
    if (!tipo) return 'account_balance';
    const t = tipo.toUpperCase();
    if (t.includes('CASSA') || t.includes('CASH')) return 'payments';
    return 'account_balance';
  }

  skeletonRows = [1, 2, 3, 4];
  skeletonRows3 = [1, 2, 3];
}
