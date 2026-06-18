import { Component, OnInit, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MovimentiService } from '../../core/services/movimenti.service';
import { ImportLogDTO } from '../../core/models/movimenti.models';
import { PagedResponse } from '../../core/models/shared.models';
import { AmbiguitaReviewDialogComponent } from '../movimenti/ambiguita-review-dialog.component';
import { ImportCountsService } from './import-counts.service';

/** Sezione "Storico": elenco import passati con contatori, revisione ambiguità e rollback. */
@Component({
  selector: 'app-import-storico',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule, MatButtonModule, MatIconModule, MatTableModule,
    MatPaginatorModule, MatProgressSpinnerModule, MatTooltipModule,
  ],
  templateUrl: './import-storico.component.html',
  styleUrls: ['./import-storico.component.scss'],
})
export class ImportStoricoComponent implements OnInit {
  private readonly movimentiService = inject(MovimentiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly counts = inject(ImportCountsService);

  readonly displayedColumns = ['dataImport', 'fonte', 'righe', 'stato', 'azioni'];
  result = signal<PagedResponse<ImportLogDTO> | null>(null);
  loading = signal(true);
  rollingBack = signal<string | null>(null);

  private page = 0;
  private size = 15;

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.movimentiService.getImportHistory(undefined, this.page, this.size).subscribe({
      next: res => { this.result.set(res); this.loading.set(false); },
      error: () => { this.loading.set(false); this.snackBar.open('Errore nel caricamento dello storico', 'OK', { duration: 3000 }); },
    });
  }

  onPage(e: PageEvent): void { this.page = e.pageIndex; this.size = e.pageSize; this.load(); }

  pendenti(log: ImportLogDTO): number {
    return Math.max(0, (log.righeAmbigue ?? 0) - (log.righeAmbigueClassificate ?? 0));
  }

  apriRevisione(log: ImportLogDTO): void {
    this.dialog.open(AmbiguitaReviewDialogComponent, { data: { importLogId: log.id }, width: '900px', maxHeight: '90vh' })
      .afterClosed().subscribe(classified => { if (classified) { this.load(); this.counts.reload(); } });
  }

  rollback(log: ImportLogDTO): void {
    const ok = window.confirm(
      `Annullare l'import del ${this.formatDate(log.dataImport)}?\n` +
      `Verranno eliminati tutti i movimenti, scartati, eventi e ricorrenti generati. Operazione reversibile solo ri-importando.`);
    if (!ok) return;
    this.rollingBack.set(log.id);
    this.movimentiService.rollbackImport(log.id).subscribe({
      next: () => { this.rollingBack.set(null); this.load(); this.counts.reload(); this.snackBar.open('Import annullato', 'OK', { duration: 2500 }); },
      error: err => { this.rollingBack.set(null); this.snackBar.open(err.error?.message ?? 'Rollback non riuscito', 'OK', { duration: 4000 }); },
    });
  }

  statoColor(s: string): string {
    return ({ COMPLETATO: '#2E7D32', COMPLETATO_CON_AMBIGUITA: '#E65100', ERRORE: '#C62828', IN_CORSO: '#1565C0' } as Record<string, string>)[s] ?? '#6B7280';
  }
  statoLabel(s: string): string {
    return ({ COMPLETATO: 'Completato', COMPLETATO_CON_AMBIGUITA: 'Con ambiguità', ERRORE: 'Errore', IN_CORSO: 'In corso' } as Record<string, string>)[s] ?? s;
  }
  fonteLabel(f: string): string {
    return ({ IMPORT_BILLY: 'Billy', IMPORT_BANCA: 'Banca', IMPORT_CONGIUNTO: 'Congiunto' } as Record<string, string>)[f] ?? f;
  }
  formatDate(str: string): string {
    if (!str) return '—';
    return new Date(str).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}
