import {
  Component,
  OnInit,
  signal,
  inject,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  effect,
} from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EventiService } from '../../core/services/eventi.service';
import { AuthService } from '../../core/auth/auth.service';
import { EventoDTO, StatoEvento } from '../../core/models/eventi.models';
import { PagedResponse } from '../../core/models/shared.models';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';

const STATO_COLORS: Record<StatoEvento, string> = {
  PREVENTIVATO: '#FFA500',
  CONFERMATO:   '#2196F3',
  SALDATO:      '#4CAF50',
  ANNULLATO:    '#9E9E9E',
};

@Component({
  selector: 'app-eventi-miei-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    EmptyStateComponent,
    SkeletonLoaderComponent,
  ],
  templateUrl: './eventi-miei-list.component.html',
  styleUrls: ['./eventi-miei-list.component.scss'],
})
export class EventiMieiListComponent implements OnInit {
  private readonly eventiService = inject(EventiService);
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly cdr = inject(ChangeDetectorRef);

  result = signal<PagedResponse<EventoDTO> | null>(null);
  loading = signal(false);

  currentPage = 0;
  readonly pageSize = 20;

  constructor() {
    // Se l'ADMIN collega il record personale a runtime (revalidateSession aggiorna
    // il signal user), ricarica automaticamente. Evita chiamate inutili a /miei
    // quando personaleId è ancora null.
    effect(() => {
      const pid = this.authService.personaleId();
      if (pid) {
        this.loadData();
      } else {
        this.result.set(null);
        this.loading.set(false);
      }
    });
  }

  ngOnInit(): void {
    // L'effect nel constructor copre già il caricamento iniziale; lo lasciamo
    // come hook esplicito per documentare l'init.
  }

  loadData(): void {
    if (!this.authService.personaleId()) {
      this.result.set(null);
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.result.set(null); // reset per garantire skeleton anche su reload successivi
    this.eventiService.getMiei(this.currentPage, this.pageSize).subscribe({
      next: res => {
        this.result.set(res);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Errore nel caricamento degli eventi', 'OK', { duration: 3000 });
        this.cdr.markForCheck();
      },
    });
  }

  onPage(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.loadData();
  }

  goToDetail(evento: EventoDTO): void {
    this.router.navigate(['/eventi', evento.id]);
  }

  statoColor(stato: StatoEvento): string {
    return STATO_COLORS[stato] ?? '#9E9E9E';
  }

  formatDate(str: string | null): string {
    if (!str) return '—';
    const [y, m, d] = str.split('-');
    return `${d}/${m}/${y}`;
  }
}
