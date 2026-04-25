import {
  Component,
  signal,
  inject,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MovimentiService } from '../../core/services/movimenti.service';
import { BulkImportResponse, MovimentoCreateRequest } from '../../core/models/movimenti.models';

@Component({
  selector: 'app-import-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatDividerModule,
  ],
  templateUrl: './import-dialog.component.html',
  styleUrls: ['./import-dialog.component.scss'],
})
export class ImportDialogComponent {
  private readonly movimentiService = inject(MovimentiService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialogRef = inject(MatDialogRef<ImportDialogComponent, boolean>);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly jsonControl = new FormControl<string>('', {
    nonNullable: true,
    validators: Validators.required,
  });

  importing = signal(false);
  importResult = signal<BulkImportResponse | null>(null);
  parseError = signal<string | null>(null);

  onImport(): void {
    this.parseError.set(null);
    const raw = this.jsonControl.value.trim();
    if (!raw) return;

    let parsed: MovimentoCreateRequest[];
    try {
      const data = JSON.parse(raw);
      parsed = Array.isArray(data) ? data : data.movimenti ?? [];
    } catch {
      this.parseError.set('JSON non valido. Incolla un array JSON di movimenti.');
      return;
    }

    if (parsed.length === 0) {
      this.parseError.set('L\'array è vuoto.');
      return;
    }
    if (parsed.length > 500) {
      this.parseError.set('Massimo 500 movimenti per import.');
      return;
    }

    this.importing.set(true);
    this.movimentiService.bulkImport(parsed).subscribe({
      next: res => {
        this.importResult.set(res);
        this.importing.set(false);
        this.cdr.markForCheck();
      },
      error: err => {
        this.importing.set(false);
        const msg = err.error?.message ?? 'Errore durante l\'import';
        this.snackBar.open(msg, 'OK', { duration: 4000 });
        this.cdr.markForCheck();
      },
    });
  }

  close(): void {
    const imported = this.importResult()?.importati ?? 0;
    this.dialogRef.close(imported > 0);
  }
}
