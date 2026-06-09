import {
  Component,
  signal,
  computed,
  inject,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { MatDialogModule, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { MovimentiService } from '../../core/services/movimenti.service';
import { EtlImportResponse, FonteImport } from '../../core/models/movimenti.models';
import { AmbiguitaReviewDialogComponent } from './ambiguita-review-dialog.component';

interface FonteOption {
  value: FonteImport;
  label: string;
  hint: string;
  accept: string;
}

@Component({
  selector: 'app-import-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatExpansionModule,
  ],
  templateUrl: './import-dialog.component.html',
  styleUrls: ['./import-dialog.component.scss'],
})
export class ImportDialogComponent {
  private readonly movimentiService = inject(MovimentiService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly dialogRef = inject(MatDialogRef<ImportDialogComponent, boolean>);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly fonti: FonteOption[] = [
    { value: 'billy', label: 'Billy (Registratore Cassa)', hint: 'File Excel .xlsx', accept: '.xlsx' },
    { value: 'bpm',   label: 'Banco BPM',                  hint: 'File CSV',         accept: '.csv,.txt' },
    { value: 'ca',    label: 'Crédit Agricole',            hint: 'File CSV',         accept: '.csv,.txt' },
  ];

  fonte = signal<FonteImport>('billy');
  selectedFile = signal<File | null>(null);
  importing = signal(false);
  importResult = signal<EtlImportResponse | null>(null);

  readonly currentAccept = computed(() => this.fonti.find(f => f.value === this.fonte())!.accept);

  onFonteChange(value: FonteImport): void {
    this.fonte.set(value);
    this.selectedFile.set(null);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile.set(input.files && input.files.length ? input.files[0] : null);
  }

  onImport(): void {
    const file = this.selectedFile();
    if (!file) return;

    let obs: Observable<EtlImportResponse>;
    switch (this.fonte()) {
      case 'bpm': obs = this.movimentiService.importBpm(file); break;
      case 'ca':  obs = this.movimentiService.importCa(file); break;
      default:    obs = this.movimentiService.importBilly(file); break;
    }

    this.importing.set(true);
    obs.subscribe({
      next: res => {
        this.importResult.set(res);
        this.importing.set(false);
        this.cdr.markForCheck();
      },
      error: err => {
        this.importing.set(false);
        const msg = err.error?.message ?? 'Errore durante l\'import del file';
        this.snackBar.open(msg, 'OK', { duration: 5000 });
        this.cdr.markForCheck();
      },
    });
  }

  vaiAllaRevisione(): void {
    const res = this.importResult();
    if (!res) return;
    this.dialog.open(AmbiguitaReviewDialogComponent, {
      width: '900px',
      maxHeight: '90vh',
      data: { importLogId: res.importLogId },
    });
  }

  close(): void {
    const imported = this.importResult()?.importati ?? 0;
    this.dialogRef.close(imported > 0);
  }
}
