import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MovimentiService } from '../../core/services/movimenti.service';
import { ContoBancarioDTO } from '../../core/models/anagrafica.models';
import { MovimentoDTOShared } from '../../core/models/shared.models';

export interface SenzaBancaData {
  conti: ContoBancarioDTO[];
}

/** Destinazione: i 3 conti reali dove può finire un incasso. */
interface Destinazione {
  id: number;
  nome: string;
  icon: string;
}

const LABEL_BREVE: Record<number, string> = {
  1: 'BPM',
  2: 'Crédit Agricole',
  3: 'Cassa',
};
const FONTE_LABEL: Record<string, string> = {
  MANUALE: 'Manuale', IMPORT_BANCA: 'Import banca', IMPORT_BILLY: 'Billy',
  IMPORT_ALVEARE: 'Alveare', IMPORT_FATTURA: 'Fattura',
};

/**
 * Catalogazione manuale dei movimenti senza conto. Per ogni incasso mostra la sua
 * natura (evento collegato, fornitore, categoria, fonte) e tre azioni dirette per
 * attribuirlo a BPM, Crédit Agricole o Cassa. Ogni assegnazione aggiorna i saldi.
 */
@Component({
  selector: 'app-movimenti-senza-banca-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <div class="sb">
      <header class="sb__head">
        <div class="sb__title">
          <mat-icon>account_balance_wallet</mat-icon>
          <h2>Movimenti senza banca</h2>
          @if (!loading()) {
            <span class="sb__count" [class.sb__count--zero]="!movimenti().length">{{ movimenti().length }}</span>
          }
        </div>
        <button mat-icon-button (click)="chiudi()" aria-label="Chiudi"><mat-icon>close</mat-icon></button>
      </header>
      <p class="sb__sub">Attribuisci ogni incasso al conto reale o alla cassa: i saldi si aggiornano subito.</p>

      @if (loading()) {
        <div class="sb__center"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (!movimenti().length) {
        <div class="sb__empty">
          <mat-icon>task_alt</mat-icon>
          <p>Tutto a posto.</p>
          <span>Nessun movimento da catalogare: ogni incasso ha già un conto.</span>
        </div>
      } @else {
        <ul class="sb__list">
          @for (m of movimenti(); track m.id) {
            <li class="sb__row" [class.sb__row--busy]="busyId() === m.id">
              <div class="sb__info">
                <div class="sb__amount" [class.is-in]="m.tipo === 'ENTRATA'" [class.is-out]="m.tipo === 'USCITA'">
                  {{ m.tipo === 'ENTRATA' ? '+' : '−' }}{{ eur(m.importo) }}
                </div>
                <div class="sb__meta">
                  <div class="sb__line">
                    <span class="sb__date">{{ formatData(m.dataMovimento) }}</span>
                    <p class="sb__desc">{{ m.descrizione || 'Senza descrizione' }}</p>
                  </div>
                  <div class="sb__tags">
                    @if (m.eventoNome) {
                      <span class="tag tag--evento">
                        <mat-icon>celebration</mat-icon>{{ m.eventoNome }}@if (m.tipoEventoMovimento) { · {{ m.tipoEventoMovimento }} }
                      </span>
                    } @else if (m.fornitoreNome) {
                      <span class="tag"><mat-icon>store</mat-icon>{{ m.fornitoreNome }}</span>
                    } @else if (m.categoriaNome) {
                      <span class="tag"><mat-icon>sell</mat-icon>{{ m.categoriaNome }}</span>
                    } @else {
                      <span class="tag tag--muto"><mat-icon>help_outline</mat-icon>Non collegato</span>
                    }
                    @if (m.fonte) { <span class="tag tag--soft">{{ fonteLabel(m.fonte) }}</span> }
                  </div>
                </div>
              </div>
              <div class="sb__actions">
                <span class="sb__assign">Assegna a</span>
                <div class="sb__dest">
                  @for (d of destinazioni; track d.id) {
                    <button type="button" class="dest" [class.dest--cassa]="d.id === 3"
                            [disabled]="busyId() === m.id" (click)="assegna(m, d)">
                      <mat-icon>{{ d.icon }}</mat-icon>{{ d.nome }}
                    </button>
                  }
                </div>
              </div>
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: [`
    .sb { display:flex; flex-direction:column; max-height:80vh; width:min(680px,92vw);
          background:var(--card); color:var(--text-main); }
    .sb__head { display:flex; align-items:center; justify-content:space-between;
                padding:18px 20px 10px; }
    .sb__title { display:flex; align-items:center; gap:10px; }
    .sb__title mat-icon { color:var(--primary); }
    .sb__title h2 { margin:0; font-size:1.15rem; font-weight:650; letter-spacing:-.01em; }
    .sb__count { min-width:24px; height:24px; padding:0 8px; border-radius:999px;
                 display:inline-flex; align-items:center; justify-content:center;
                 background:var(--accent); color:var(--on-accent); font-size:.8rem; font-weight:700; }
    .sb__count--zero { background:var(--border-strong); color:var(--text-sub); }
    .sb__sub { margin:0; padding:0 20px 14px; color:var(--text-sub); font-size:.86rem; }

    .sb__center, .sb__empty { display:flex; flex-direction:column; align-items:center;
                gap:8px; padding:48px 20px; color:var(--text-sub); text-align:center; }
    .sb__empty mat-icon { font-size:40px; width:40px; height:40px; color:var(--success); }
    .sb__empty p { margin:0; font-weight:600; color:var(--text-main); }
    .sb__empty span { font-size:.85rem; max-width:36ch; }

    .sb__list { list-style:none; margin:0; padding:4px 12px 16px; overflow-y:auto; }
    .sb__row { display:flex; align-items:center; justify-content:space-between; gap:16px;
               padding:12px 12px; border-radius:var(--radius-md); transition:background var(--t-fast) var(--ease); }
    .sb__row + .sb__row { border-top:1px solid var(--border-soft); }
    .sb__row:hover { background:var(--surface-sunken); }
    .sb__row--busy { opacity:.5; pointer-events:none; }

    .sb__info { display:flex; align-items:flex-start; gap:14px; min-width:0; }
    .sb__amount { font-variant-numeric:tabular-nums; font-weight:700; font-size:1.02rem;
                  white-space:nowrap; min-width:96px; }
    .sb__amount.is-in { color:var(--success); }
    .sb__amount.is-out { color:var(--danger); }
    .sb__meta { min-width:0; }
    .sb__line { display:flex; align-items:baseline; gap:8px; flex-wrap:wrap; }
    .sb__date { font-size:.76rem; color:var(--text-faint); white-space:nowrap; font-variant-numeric:tabular-nums; }
    .sb__desc { margin:0; font-size:.9rem; font-weight:550; flex:1 1 14ch; min-width:0; overflow-wrap:anywhere; }
    .sb__tags { display:flex; flex-wrap:wrap; gap:6px; margin-top:5px; }
    .tag { display:inline-flex; align-items:center; gap:4px; padding:2px 8px; border-radius:999px;
           font-size:.72rem; font-weight:600; background:var(--surface-2); color:var(--text-sub);
           border:1px solid var(--border-soft); }
    .tag mat-icon { font-size:13px; width:13px; height:13px; }
    .tag--evento { background:var(--tint-primary); color:var(--primary-d); border-color:transparent; }
    .tag--soft { background:transparent; color:var(--text-faint); border-style:dashed; }
    .tag--muto { background:transparent; color:var(--text-faint); }

    .sb__actions { display:flex; flex-direction:column; align-items:flex-end; gap:6px; flex-shrink:0; }
    .sb__assign { font-size:.7rem; text-transform:uppercase; letter-spacing:.06em; color:var(--text-faint); }
    .sb__dest { display:flex; gap:6px; }
    .dest { display:inline-flex; align-items:center; gap:5px; padding:7px 11px; cursor:pointer;
            border:1px solid var(--border-strong); border-radius:var(--radius-sm); background:var(--card);
            color:var(--info-d); font-size:.82rem; font-weight:650; font-family:inherit;
            transition:all var(--t-fast) var(--ease); }
    .dest mat-icon { font-size:16px; width:16px; height:16px; }
    .dest:hover { background:var(--tint-info); border-color:var(--info); color:var(--info-d);
                  transform:translateY(-1px); box-shadow:var(--shadow-sm); }
    .dest--cassa { color:var(--accent-d); }
    .dest--cassa:hover { background:rgba(var(--accent-rgb),.12); border-color:var(--accent); color:var(--accent-d); }
    .dest:disabled { opacity:.5; cursor:default; transform:none; box-shadow:none; }

    @media (max-width:560px) {
      .sb__row { flex-direction:column; align-items:stretch; }
      .sb__actions { align-items:stretch; }
      .sb__dest { justify-content:space-between; }
      .dest { flex:1; justify-content:center; }
    }
    @media (prefers-reduced-motion:reduce) { .dest, .sb__row { transition:none; } .dest:hover { transform:none; } }
  `],
})
export class MovimentiSenzaBancaDialogComponent {
  private readonly ref = inject(MatDialogRef<MovimentiSenzaBancaDialogComponent>);
  private readonly svc = inject(MovimentiService);
  private readonly snack = inject(MatSnackBar);
  readonly data = inject<SenzaBancaData>(MAT_DIALOG_DATA);

  readonly movimenti = signal<MovimentoDTOShared[]>([]);
  readonly loading = signal(true);
  readonly busyId = signal<string | null>(null);
  private modificato = false;

  readonly destinazioni: Destinazione[] = (this.data.conti ?? [])
    .filter((c) => c.id === 1 || c.id === 2 || c.id === 3)
    .sort((a, b) => a.id - b.id)
    .map((c) => ({ id: c.id, nome: LABEL_BREVE[c.id] ?? c.nome, icon: c.id === 3 ? 'payments' : 'account_balance' }));

  constructor() {
    this.svc.getSenzaBanca().subscribe({
      next: (list) => { this.movimenti.set(list); this.loading.set(false); },
      error: () => {
        this.loading.set(false);
        this.snack.open('Impossibile caricare i movimenti senza banca.', 'OK', { duration: 4000 });
      },
    });
  }

  assegna(m: MovimentoDTOShared, d: Destinazione): void {
    this.busyId.set(m.id);
    this.svc.assegnaConto(m.id, d.id).subscribe({
      next: () => {
        this.movimenti.update((l) => l.filter((x) => x.id !== m.id));
        this.busyId.set(null);
        this.modificato = true;
        this.snack.open(`${this.eur(m.importo)} assegnato a ${d.nome}`, undefined, { duration: 2200 });
      },
      error: () => {
        this.busyId.set(null);
        this.snack.open('Assegnazione non riuscita. Riprova.', 'OK', { duration: 4000 });
      },
    });
  }

  chiudi(): void { this.ref.close(this.modificato); }

  eur(v: number): string {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(v ?? 0);
  }
  formatData(iso: string): string {
    return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
  }
  fonteLabel(f: string): string { return FONTE_LABEL[f] ?? f; }
}
