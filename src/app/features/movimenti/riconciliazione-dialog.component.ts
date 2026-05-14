import {
  Component,
  OnInit,
  signal,
  inject,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MovimentiService } from '../../core/services/movimenti.service';
import { MovimentoDTO } from '../../core/models/movimenti.models';
import { EuroPipe } from '../../shared/pipes/euro.pipe';

@Component({
  selector: 'app-riconciliazione-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    EuroPipe,
  ],
  templateUrl: './riconciliazione-dialog.component.html',
  styleUrls: ['./riconciliazione-dialog.component.scss'],
})
export class RiconciliazioneDialogComponent implements OnInit {
  private readonly movimentiService = inject(MovimentiService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialogRef = inject(MatDialogRef<RiconciliazioneDialogComponent>);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly displayedColumns = ['dataMovimento', 'descrizione', 'importo', 'azioni'];

  all = signal<MovimentoDTO[]>([]);
  loading = signal(false);
  matchLoading = signal(false);
  matchResult = signal<number | null>(null);

  // Local pagination
  page = 0;
  size = 10;

  // Per-row note controls (keyed by id)
  noteControls = new Map<string, FormControl<string>>();

  get pageData(): MovimentoDTO[] {
    return this.all().slice(this.page * this.size, (this.page + 1) * this.size);
  }

  get totalElements(): number {
    return this.all().length;
  }

  ngOnInit(): void {
    this.loadNonRiconciliati();
  }

  loadNonRiconciliati(): void {
    this.loading.set(true);
    this.movimentiService.getNonRiconciliati().subscribe({
      next: data => {
        this.all.set(data);
        data.forEach(m => {
          if (!this.noteControls.has(m.id)) {
            this.noteControls.set(m.id, new FormControl<string>('', { nonNullable: true }));
          }
        });
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Errore nel caricamento', 'OK', { duration: 3000 });
        this.cdr.markForCheck();
      },
    });
  }

  matchAutomatico(): void {
    this.matchLoading.set(true);
    this.movimentiService.matchAutomatico().subscribe({
      next: res => {
        this.matchResult.set(res.matched);
        this.matchLoading.set(false);
        this.loadNonRiconciliati();
        this.cdr.markForCheck();
      },
      error: () => {
        this.matchLoading.set(false);
        this.snackBar.open('Errore durante il match automatico', 'OK', { duration: 3000 });
        this.cdr.markForCheck();
      },
    });
  }

  riconcilia(mov: MovimentoDTO): void {
    const note = this.noteControls.get(mov.id)?.value || undefined;
    this.movimentiService.riconcilia(mov.id, note).subscribe({
      next: () => {
        this.snackBar.open('Movimento riconciliato', 'OK', { duration: 2000 });
        this.all.update(list => list.filter(m => m.id !== mov.id));
        this.cdr.markForCheck();
      },
      error: () => this.snackBar.open('Errore durante la riconciliazione', 'OK', { duration: 3000 }),
    });
  }

  onPage(event: PageEvent): void {
    this.page = event.pageIndex;
    this.size = event.pageSize;
    this.cdr.markForCheck();
  }

  formatDate(str: string): string {
    if (!str) return '—';
    const [y, m, d] = str.split('-');
    return `${d}/${m}/${y}`;
  }

  close(): void {
    this.dialogRef.close();
  }
}
