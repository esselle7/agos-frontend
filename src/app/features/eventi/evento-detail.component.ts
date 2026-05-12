import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  inject,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, forkJoin, takeUntil } from 'rxjs';
import { EventiService } from '../../core/services/eventi.service';
import { BuService } from '../../core/services/bu.service';
import { AuthService } from '../../core/auth/auth.service';
import {
  EventoDTO,
  EventoPartecipanteDTO,
  StatoEvento,
  TipoPagamentoEvento,
} from '../../core/models/eventi.models';
import { BusinessUnitDTO } from '../../core/models/anagrafica.models';
import { DecimalPipe } from '@angular/common';
import { EuroPipe } from '../../shared/pipes/euro.pipe';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

const STATO_COLORS: Record<StatoEvento, string> = {
  PREVENTIVATO: '#FFA500',
  CONFERMATO:   '#2196F3',
  SALDATO:      '#4CAF50',
  ANNULLATO:    '#9E9E9E',
};

const PAGAMENTO_ICONE: Record<TipoPagamentoEvento, string> = {
  CAPARRA: 'lock',
  ACCONTO: 'savings',
  SALDO:   'done_all',
  PENALE:  'gavel',
};

const PAGAMENTO_COLORS: Record<TipoPagamentoEvento, string> = {
  CAPARRA: '#f57c00',
  ACCONTO: '#1976d2',
  SALDO:   '#388e3c',
  PENALE:  '#c62828',
};

const STEP_ORDER: StatoEvento[] = ['PREVENTIVATO', 'CONFERMATO', 'SALDATO'];

@Component({
  selector: 'app-evento-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatDividerModule,
    MatTooltipModule,
    DecimalPipe,
    EuroPipe,
    SkeletonLoaderComponent,
  ],
  templateUrl: './evento-detail.component.html',
  styleUrls: ['./evento-detail.component.scss'],
})
export class EventoDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly eventiService = inject(EventiService);
  private readonly buService = inject(BuService);
  readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  readonly statoColors = STATO_COLORS;
  readonly pagIcone = PAGAMENTO_ICONE;
  readonly pagColors = PAGAMENTO_COLORS;
  readonly stepOrder = STEP_ORDER;

  evento = signal<EventoDTO | null>(null);
  partecipanti = signal<EventoPartecipanteDTO[]>([]);
  buMap = signal<Map<number, BusinessUnitDTO>>(new Map());
  loading = signal(true);
  loadingPartecipanti = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    forkJoin({
      bu:     this.buService.getAll(),
      evento: this.eventiService.getById(id),
    }).subscribe({
      next: ({ bu, evento }) => {
        this.buMap.set(new Map(bu.map(u => [u.id, u])));
        this.evento.set(evento);
        this.loading.set(false);
        this.cdr.markForCheck();
        if (this.authService.isAdmin()) this.loadPartecipanti(id);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Errore nel caricamento dell\'evento', 'OK', { duration: 3000 });
        this.cdr.markForCheck();
      },
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadPartecipanti(eventoId: string): void {
    this.loadingPartecipanti.set(true);
    this.eventiService.getPartecipanti(eventoId).subscribe({
      next: list => {
        this.partecipanti.set(list);
        this.loadingPartecipanti.set(false);
        this.cdr.markForCheck();
      },
      error: () => { this.loadingPartecipanti.set(false); this.cdr.markForCheck(); },
    });
  }

  reloadEvento(): void {
    const id = this.evento()!.id;
    this.eventiService.getById(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: ev => { this.evento.set(ev); this.cdr.markForCheck(); },
      error: () => {
        this.snackBar.open('Errore nel ricaricamento dell\'evento', 'OK', { duration: 3000 });
        this.cdr.markForCheck();
      },
    });
  }

  openPagamento(): void {
    const ev = this.evento()!;
    const tipiGiaPresenti = ev.pagamenti
      .filter(p => p.stato !== 'ANNULLATO')
      .map(p => p.tipo);

    import('./pagamento-form-dialog.component').then(m => {
      this.dialog.open(m.PagamentoFormDialogComponent, {
        width: '560px',
        maxHeight: '90vh',
        data: {
          eventoId:                    ev.id,
          nomeEvento:                  ev.nome,
          stato:                       ev.stato,
          importoTotalePreviventivato: ev.importoTotalePreviventivato,
          importoResiduo:              ev.importoResiduo,
          tipiGiaPresenti,
        },
      }).afterClosed().subscribe(ok => { if (ok) this.reloadEvento(); });
    }).catch(() => this.snackBar.open('Errore nel caricamento del dialogo', 'OK', { duration: 3000 }));
  }

  openCambioStato(nuovoStato: StatoEvento): void {
    const ev = this.evento()!;
    import('./cambio-stato-dialog.component').then(m => {
      this.dialog.open(m.CambioStatoDialogComponent, {
        width: '480px',
        data: { eventoId: ev.id, statoCorrente: ev.stato, nuovoStato },
      }).afterClosed().subscribe(ok => { if (ok) this.reloadEvento(); });
    }).catch(() => this.snackBar.open('Errore nel caricamento del dialogo', 'OK', { duration: 3000 }));
  }

  openModifica(): void {
    const ev = this.evento()!;
    import('./evento-form-dialog.component').then(m => {
      this.dialog.open(m.EventoFormDialogComponent, {
        width: '700px', maxHeight: '90vh',
        data: { eventoId: ev.id },
      }).afterClosed().subscribe(ok => { if (ok) this.reloadEvento(); });
    }).catch(() => this.snackBar.open('Errore nel caricamento del dialogo', 'OK', { duration: 3000 }));
  }

  deleteEvento(): void {
    const ev = this.evento()!;
    this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Elimina evento',
        message: `Eliminare l'evento "${ev.nome}"? L'operazione non è reversibile.`,
        confirmLabel: 'Elimina', danger: true,
      },
    }).afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.eventiService.delete(ev.id).subscribe({
        next: () => { this.snackBar.open('Evento eliminato', 'OK', { duration: 3000 }); this.router.navigate(['/eventi']); },
        error: () => this.snackBar.open('Errore durante l\'eliminazione', 'OK', { duration: 3000 }),
      });
    });
  }

  removePartecipante(id: number): void {
    this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Rimuovi partecipante', message: 'Rimuovere questo partecipante dall\'evento?', confirmLabel: 'Rimuovi', danger: true },
    }).afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.eventiService.deletePartecipante(id).subscribe({
        next: () => { this.partecipanti.update(l => l.filter(p => p.id !== id)); this.cdr.markForCheck(); },
      });
    });
  }

  goBack(): void { this.router.navigate(['/eventi']); }

  // ── Step journey helpers ──────────────────────────────────────────────────

  stepState(step: StatoEvento): 'done' | 'active' | 'next' {
    const ev = this.evento()!;
    let effectiveStato: StatoEvento = ev.stato;
    if (ev.stato === 'ANNULLATO') {
      const wasConfirmed = ev.pagamenti.some(
        p => p.stato !== 'ANNULLATO' && (p.tipo === 'CAPARRA' || p.tipo === 'ACCONTO')
      );
      effectiveStato = wasConfirmed ? 'CONFERMATO' : 'PREVENTIVATO';
    }
    const curIdx = STEP_ORDER.indexOf(effectiveStato);
    const stepIdx = STEP_ORDER.indexOf(step);
    if (stepIdx < curIdx) return 'done';
    if (stepIdx === curIdx) return 'active';
    return 'next';
  }

  stepLineActive(afterStep: StatoEvento): boolean {
    const nextStep = STEP_ORDER[STEP_ORDER.indexOf(afterStep) + 1] as StatoEvento | undefined;
    if (!nextStep) return false;
    const s = this.stepState(nextStep);
    return s === 'done' || s === 'active';
  }

  stepDateConferma(): string {
    const pag = this.evento()?.pagamenti.find(
      p => (p.tipo === 'CAPARRA' || p.tipo === 'ACCONTO') && p.stato !== 'ANNULLATO'
    );
    if (pag) return this.formatDate(pag.dataFinanziaria);
    return this.stepState('CONFERMATO') === 'next' ? 'da confermare' : '—';
  }

  stepDateSaldo(): string {
    const pag = this.evento()?.pagamenti.find(
      p => p.tipo === 'SALDO' && p.stato !== 'ANNULLATO'
    );
    if (pag) return this.formatDate(pag.dataFinanziaria);
    return this.stepState('SALDATO') === 'next' ? 'da registrare' : '—';
  }

  // ── Template helpers ──────────────────────────────────────────────────────

  statoColor(stato: StatoEvento): string { return STATO_COLORS[stato] ?? '#9E9E9E'; }
  buNome(buId: number): string { return this.buMap().get(buId)?.nome ?? `BU#${buId}`; }
  buColore(buId: number): string { return this.buMap().get(buId)?.colore ?? '#6B7280'; }
  progressColor(pct: number | null): string { return (pct ?? 0) >= 100 ? '#4CAF50' : '#FFA500'; }

  formatDate(str: string | null): string {
    if (!str) return '—';
    const [y, m, d] = str.split('-');
    return `${d}/${m}/${y}`;
  }

  formatDatetime(iso: string): string {
    return new Date(iso).toLocaleDateString('it-IT', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }
}
