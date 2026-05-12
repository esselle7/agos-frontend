import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { EventiService } from '../../core/services/eventi.service';
import { EventiDashboardDTO, EventoDTO, StatoEvento } from '../../core/models/eventi.models';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { BadgeComponent } from '../../shared/components/badge/badge.component';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { EuroPipe } from '../../shared/pipes/euro.pipe';

const STATO_COLORS: Record<StatoEvento, string> = {
  PREVENTIVATO: '#FFA500',
  CONFERMATO:   '#2196F3',
  SALDATO:      '#4CAF50',
  ANNULLATO:    '#9E9E9E',
};

@Component({
  selector: 'app-eventi-dashboard',
  standalone: true,
  imports: [
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    StatCardComponent,
    BadgeComponent,
    SkeletonLoaderComponent,
    EmptyStateComponent,
    EuroPipe,
  ],
  templateUrl: './eventi-dashboard.component.html',
  styleUrls: ['./eventi-dashboard.component.scss'],
})
export class EventiDashboardComponent implements OnInit {
  private readonly eventiSvc = inject(EventiService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly dashboardEventi = signal<EventiDashboardDTO | null>(null);
  readonly eventi = signal<EventoDTO[]>([]);
  readonly from = signal<string>('');
  readonly to = signal<string>('');

  dashboardError = false;
  eventiError = false;

  get profittoColor(): 'success' | 'danger' | 'neutral' {
    const p = this.dashboardEventi()?.profittoTotale ?? 0;
    if (p > 0) return 'success';
    if (p < 0) return 'danger';
    return 'neutral';
  }

  ngOnInit(): void {
    const today = new Date().toISOString().slice(0, 10);
    const firstOfYear = `${new Date().getFullYear()}-01-01`;
    this.from.set(firstOfYear);
    this.to.set(today);
    this.loadData(firstOfYear, today);
  }

  private loadData(from: string, to: string): void {
    forkJoin({
      dashboard: this.eventiSvc.getDashboard(from, to)
        .pipe(catchError(() => { this.dashboardError = true; return of(null); })),
      eventi: this.eventiSvc.getList({ page: 0, size: 10 })
        .pipe(catchError(() => { this.eventiError = true; return of({ content: [] as EventoDTO[], page: 0, size: 10, totalElements: 0, totalPages: 0 }); })),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(res => {
        if (res.dashboard) this.dashboardEventi.set(res.dashboard);
        this.eventi.set(res.eventi.content);
        this.loading.set(false);
      });
  }

  onFromChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    if (val) {
      this.from.set(val);
      this.reloadDashboard();
    }
  }

  onToChange(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    if (val) {
      this.to.set(val);
      this.reloadDashboard();
    }
  }

  private reloadDashboard(): void {
    this.dashboardError = false;
    this.eventiSvc.getDashboard(this.from(), this.to())
      .pipe(
        catchError(() => { this.dashboardError = true; return of(null); }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(res => { if (res) this.dashboardEventi.set(res); });
  }

  navigateToNewEvento(): void {
    this.router.navigate(['/eventi'], { queryParams: { openForm: 'true' } });
  }

  navigateToEventi(): void {
    this.router.navigate(['/eventi']);
  }

  navigateToEvento(id: string): void {
    this.router.navigate(['/eventi', id]);
  }

  statoColor(stato: StatoEvento): string {
    return STATO_COLORS[stato] ?? '#9E9E9E';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  skeletonRows = [1, 2, 3, 4];
}
