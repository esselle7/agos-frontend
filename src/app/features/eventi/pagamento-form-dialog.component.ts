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
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
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
import { forkJoin } from 'rxjs';
import { EventiService } from '../../core/services/eventi.service';
import { ContiService } from '../../core/services/conti.service';
import { LookupService } from '../../core/services/lookup.service';
import { CurrencyInputComponent } from '../../shared/components/currency-input/currency-input.component';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { EuroPipe } from '../../shared/pipes/euro.pipe';
import { PagamentoRequest, TipoPagamentoEvento } from '../../core/models/eventi.models';
import { ContoBancarioDTO, MetodoPagamentoDTO } from '../../core/models/anagrafica.models';

export interface PagamentoFormDialogData {
  eventoId: string;
  importoResiduo: number;
}

@Component({
  selector: 'app-pagamento-form-dialog',
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
    EuroPipe,
  ],
  templateUrl: './pagamento-form-dialog.component.html',
})
export class PagamentoFormDialogComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<PagamentoFormDialogComponent>);
  readonly data: PagamentoFormDialogData = inject(MAT_DIALOG_DATA);
  private readonly eventiService = inject(EventiService);
  private readonly contiService = inject(ContiService);
  private readonly lookupService = inject(LookupService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly cdr = inject(ChangeDetectorRef);

  conti = signal<ContoBancarioDTO[]>([]);
  metodiPagamento = signal<MetodoPagamentoDTO[]>([]);
  loadingLookup = signal(true);
  saving = signal(false);

  readonly form = new FormGroup({
    tipo:              new FormControl<TipoPagamentoEvento>('CAPARRA', { nonNullable: true }),
    importo:           new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]),
    data:              new FormControl<Date | null>(new Date(), [Validators.required]),
    metodoPagamentoId: new FormControl<number | null>(null, [Validators.required]),
    contoBancarioId:   new FormControl<number | null>(null, [Validators.required]),
    note:              new FormControl<string | null>(null),
  });

  ngOnInit(): void {
    forkJoin({
      conti:  this.contiService.getAll(),
      metodi: this.lookupService.getMetodiPagamento(),
    }).subscribe({
      next: ({ conti, metodi }) => {
        this.conti.set(conti);
        this.metodiPagamento.set(metodi);
        this.loadingLookup.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingLookup.set(false);
        this.snackBar.open('Errore nel caricamento dei dati', 'OK', { duration: 3000 });
        this.cdr.markForCheck();
      },
    });

    // When tipo changes to SALDO, precompile importo with residuo
    this.form.controls.tipo.valueChanges.subscribe(tipo => {
      if (tipo === 'SALDO' && this.data.importoResiduo > 0) {
        this.form.controls.importo.setValue(this.data.importoResiduo);
      }
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const v = this.form.getRawValue();
    const body: PagamentoRequest = {
      tipo:              v.tipo,
      importo:           v.importo!,
      data:              this.dateToIso(v.data!),
      note:              v.note ?? null,
      metodoPagamentoId: v.metodoPagamentoId!,
      contoBancarioId:   v.contoBancarioId!,
      contoCoge:         null,
    };

    this.eventiService.addPagamento(this.data.eventoId, body).subscribe({
      next: result => {
        this.saving.set(false);
        this.snackBar.open('Pagamento registrato', 'OK', { duration: 3000 });
        this.dialogRef.close(true);

        if (result.suggerisciCompletamento) {
          this.dialog
            .open(ConfirmDialogComponent, {
              data: {
                title: 'Evento saldato',
                message: 'Il pagamento completa il saldo dell\'evento (€ 0 residuo). Vuoi segnare l\'evento come COMPLETATO?',
                confirmLabel: 'Sì, completa',
                cancelLabel: 'No, mantieni',
              },
            })
            .afterClosed()
            .subscribe(confirmed => {
              if (confirmed) {
                this.eventiService
                  .update(this.data.eventoId, { stato: 'COMPLETATO' })
                  .subscribe({
                    next: () => this.snackBar.open('Evento completato', 'OK', { duration: 3000 }),
                  });
              }
            });
        }
      },
      error: () => {
        this.saving.set(false);
        this.snackBar.open('Errore durante la registrazione del pagamento', 'OK', { duration: 3000 });
        this.cdr.markForCheck();
      },
    });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  private dateToIso(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
