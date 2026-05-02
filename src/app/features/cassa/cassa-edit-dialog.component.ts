import {
  Component,
  OnInit,
  inject,
  signal,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import {
  ReactiveFormsModule,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CassaService } from '../../core/services/cassa.service';
import { CassaMovimentoDTO, CreateCassaMovimentoRequest } from '../../core/models/cassa.models';
import { ContoBancarioDTO } from '../../core/models/anagrafica.models';
import { CurrencyInputComponent } from '../../shared/components/currency-input/currency-input.component';

export interface CassaEditDialogData {
  movimento: CassaMovimentoDTO;
  contiBancari: ContoBancarioDTO[];
}

@Component({
  selector: 'app-cassa-edit-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    CurrencyInputComponent,
  ],
  templateUrl: './cassa-edit-dialog.component.html',
})
export class CassaEditDialogComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<CassaEditDialogComponent>);
  private readonly data: CassaEditDialogData = inject(MAT_DIALOG_DATA);
  private readonly cassaService = inject(CassaService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly saving = signal(false);
  readonly contiBancari = this.data.contiBancari;

  readonly form = new FormGroup({
    tipo:          new FormControl<string>('PRELIEVO_DA_BANCA', { nonNullable: true }),
    importo:       new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]),
    dataMovimento: new FormControl<Date | null>(null, [Validators.required]),
    descrizione:   new FormControl<string | null>(null),
    contoBancaId:  new FormControl<number | null>(null, [Validators.required]),
  });

  ngOnInit(): void {
    const m = this.data.movimento;
    const [y, mo, d] = m.dataMovimento.split('-').map(Number);
    this.form.patchValue({
      tipo:          m.tipo,
      importo:       m.importo,
      dataMovimento: new Date(y, mo - 1, d),
      descrizione:   m.descrizione,
      contoBancaId:  m.contoBancaId,
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const v = this.form.getRawValue();
    const body: CreateCassaMovimentoRequest = {
      tipo:           v.tipo,
      importo:        v.importo!,
      dataMovimento:  this.toIso(v.dataMovimento!),
      descrizione:    v.descrizione,
      contoCoge:      null,
      businessUnitId: null,
      contoBancaId:   v.contoBancaId,
    };
    this.cassaService.update(this.data.movimento.id, body).subscribe({
      next: () => {
        this.saving.set(false);
        this.snackBar.open('Movimento aggiornato', 'OK', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: () => {
        this.saving.set(false);
        this.snackBar.open('Errore durante l\'aggiornamento', 'OK', { duration: 3000 });
        this.cdr.markForCheck();
      },
    });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  private toIso(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
