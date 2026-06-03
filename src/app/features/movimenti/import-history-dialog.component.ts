import {
  Component,
  OnInit,
  signal,
  inject,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { MatDialogModule, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MovimentiService } from '../../core/services/movimenti.service';
import { ImportLogDTO, ImportKpiDTO } from '../../core/models/movimenti.models';
import { PagedResponse } from '../../core/models/shared.models';
import { AmbiguitaReviewDialogComponent } from './ambiguita-review-dialog.component';

@Component({
  selector: 'app-import-history-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatChipsModule,
  ],
  templateUrl: './import-history-dialog.component.html',
  styleUrls: ['./import-history-dialog.component.scss'],
})
export class ImportHistoryDialogComponent implements OnInit {
  private readonly movimentiService = inject(MovimentiService);
  private readonly dialog = inject(MatDialog);
  private readonly dialogRef = inject(MatDialogRef<ImportHistoryDialogComponent>);
  private readonly snackBar = inject(MatSnackBar);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly displayedColumns = ['dataImport', 'fonte', 'filename', 'righe', 'stato', 'azioni'];

  result = signal<PagedResponse<ImportLogDTO> | null>(null);
  loading = signal(true);
  kpi = signal<ImportKpiDTO | null>(null);

  private page = 0;
  private size = 15;

  ngOnInit(): void {
    this.load();
    this.loadKpi();
  }

  private loadKpi(): void {
    this.movimentiService.getImportKpi().subscribe({
      next: k => { this.kpi.set(k); this.cdr.markForCheck(); },
      error: () => { /* KPI non bloccante per lo storico */ },
    });
  }

  load(): void {
    this.loading.set(true);
    this.movimentiService.getImportHistory(undefined, this.page, this.size).subscribe({
      next: res => {
        this.result.set(res);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Errore nel caricamento dello storico', 'OK', { duration: 3000 });
        this.cdr.markForCheck();
      },
    });
  }

  onPage(event: PageEvent): void {
    this.page = event.pageIndex;
    this.size = event.pageSize;
    this.load();
  }

  pendenti(log: ImportLogDTO): number {
    return Math.max(0, (log.righeAmbigue ?? 0) - (log.righeAmbigueClassificate ?? 0));
  }

  apriRevisione(log: ImportLogDTO): void {
    this.dialog.open(AmbiguitaReviewDialogComponent, {
      data: { importLogId: log.id },
      width: '900px',
      maxHeight: '90vh',
    }).afterClosed().subscribe(classified => {
      if (classified) this.load();
    });
  }

  statoColor(stato: string): string {
    const map: Record<string, string> = {
      COMPLETATO: '#2E7D32',
      COMPLETATO_CON_AMBIGUITA: '#E65100',
      ERRORE: '#C62828',
      IN_CORSO: '#1565C0',
    };
    return map[stato] ?? '#6B7280';
  }

  statoLabel(stato: string): string {
    const map: Record<string, string> = {
      COMPLETATO: 'Completato',
      COMPLETATO_CON_AMBIGUITA: 'Con ambiguità',
      ERRORE: 'Errore',
      IN_CORSO: 'In corso',
    };
    return map[stato] ?? stato;
  }

  fonteLabel(fonte: string): string {
    const map: Record<string, string> = {
      IMPORT_BILLY: 'Billy',
      IMPORT_BANCA: 'Banca',
    };
    return map[fonte] ?? fonte;
  }

  formatDate(str: string): string {
    if (!str) return '—';
    const d = new Date(str);
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  close(): void {
    this.dialogRef.close();
  }
}
