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
  Validators,
} from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EventiService } from '../../core/services/eventi.service';
import { StatoEvento } from '../../core/models/eventi.models';

export interface CambioStatoDialogData {
  eventoId: string;
  statoCorrente: StatoEvento;
  nuovoStato: StatoEvento;
}

const TITOLI: Partial<Record<StatoEvento, string>> = {
  CONFERMATO: 'Conferma Prenotazione',
  ANNULLATO:  'Annulla Evento',
};

const MESSAGGI: Partial<Record<StatoEvento, string>> = {
  CONFERMATO: 'Confermare la prenotazione? L\'evento diventerà operativo e sarà possibile aggiungere pagamenti.',
  ANNULLATO:  'Sei sicuro di voler annullare questo evento?',
};

@Component({
  selector: 'app-cambio-stato-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './cambio-stato-dialog.component.html',
})
export class CambioStatoDialogComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<CambioStatoDialogComponent>);
  readonly data: CambioStatoDialogData = inject(MAT_DIALOG_DATA);
  private readonly eventiService = inject(EventiService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly cdr = inject(ChangeDetectorRef);

  saving = signal(false);

  readonly motivazioneAnnullamento = new FormControl<string>('', { nonNullable: true });

  get isAnnullamento(): boolean {
    return this.data.nuovoStato === 'ANNULLATO';
  }

  get titolo(): string {
    return TITOLI[this.data.nuovoStato] ?? 'Cambia stato';
  }

  get messaggio(): string {
    return MESSAGGI[this.data.nuovoStato] ?? '';
  }

  ngOnInit(): void {
    if (this.isAnnullamento) {
      this.motivazioneAnnullamento.setValidators([Validators.required, Validators.minLength(5)]);
      this.motivazioneAnnullamento.updateValueAndValidity();
    }
  }

  confirm(): void {
    if (this.isAnnullamento && this.motivazioneAnnullamento.invalid) {
      this.motivazioneAnnullamento.markAsTouched();
      return;
    }

    this.saving.set(true);
    const body: { stato: StatoEvento; noteAnnullamento?: string } = { stato: this.data.nuovoStato };
    if (this.isAnnullamento) {
      body.noteAnnullamento = this.motivazioneAnnullamento.value;
    }

    this.eventiService.update(this.data.eventoId, body).subscribe({
      next: () => {
        this.saving.set(false);
        const msg = this.isAnnullamento ? 'Evento annullato' : `Stato aggiornato a ${this.data.nuovoStato}`;
        this.snackBar.open(msg, 'OK', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.saving.set(false);
        const msg = err?.error?.message ?? 'Errore durante l\'aggiornamento dello stato';
        this.snackBar.open(msg, 'OK', { duration: 4000 });
        this.cdr.markForCheck();
      },
    });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
