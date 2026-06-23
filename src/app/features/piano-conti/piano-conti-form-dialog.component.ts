import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PianoContiService } from '../../core/services/piano-conti.service';
import {
  PianoContiCogeDTO,
  PianoContiCogeUpsertRequest,
  TipoCoge,
} from '../../core/models/anagrafica.models';

export interface PianoContiFormData {
  conto?: PianoContiCogeDTO;          // assente → creazione
  presetTipo?: TipoCoge;              // tipo preselezionato (aggiunta dentro un gruppo)
  conti: PianoContiCogeDTO[];         // per il selettore "conto padre"
}

const TIPI: { value: TipoCoge; label: string }[] = [
  { value: 'RICAVO',            label: 'Ricavo' },
  { value: 'COSTO',             label: 'Costo operativo' },
  { value: 'ATTIVITA',          label: 'Attività patrimoniale' },
  { value: 'PASSIVITA',         label: 'Passività / debito' },
  { value: 'ONERE_FINANZIARIO', label: 'Onere finanziario' },
  { value: 'IMPOSTA',           label: 'Imposta / tributo' },
];

@Component({
  selector: 'app-piano-conti-form-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ isEdit ? 'Modifica conto' : 'Nuovo conto' }}</h2>

    <mat-dialog-content [formGroup]="form" class="pc-form">
      <mat-form-field appearance="outline">
        <mat-label>Codice</mat-label>
        <input matInput formControlName="codice" placeholder="es. 30.01.001" maxlength="20" />
        <mat-hint>Numero gerarchico (i punti definiscono il livello)</mat-hint>
        @if (form.controls.codice.hasError('required') && form.controls.codice.touched) {
          <mat-error>Il codice è obbligatorio</mat-error>
        }
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Descrizione</mat-label>
        <input matInput formControlName="descrizione" maxlength="255" />
        @if (form.controls.descrizione.hasError('required') && form.controls.descrizione.touched) {
          <mat-error>La descrizione è obbligatoria</mat-error>
        }
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Tipo</mat-label>
        <mat-select formControlName="tipo">
          @for (t of tipi; track t.value) {
            <mat-option [value]="t.value">{{ t.label }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Conto padre (opzionale)</mat-label>
        <mat-select formControlName="parentId">
          <mat-option [value]="null">— Nessuno —</mat-option>
          @for (c of parentOptions; track c.id) {
            <mat-option [value]="c.id">{{ c.codice }} · {{ c.nome }}</mat-option>
          }
        </mat-select>
      </mat-form-field>

      @if (errore()) {
        <p class="pc-form__error"><mat-icon>error_outline</mat-icon> {{ errore() }}</p>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button [disabled]="saving()" (click)="close()">Annulla</button>
      <button mat-flat-button color="primary" [disabled]="saving() || form.invalid" (click)="salva()">
        @if (saving()) { <mat-spinner diameter="18" /> } @else { {{ isEdit ? 'Salva' : 'Crea' }} }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .pc-form { display: flex; flex-direction: column; gap: 4px; min-width: 380px; padding-top: 8px; }
    .pc-form mat-form-field { width: 100%; }
    .pc-form__error {
      display: flex; align-items: center; gap: 6px; margin: 0;
      color: var(--danger); font-size: 0.85rem;
    }
    .pc-form__error mat-icon { font-size: 18px; width: 18px; height: 18px; }
  `],
})
export class PianoContiFormDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<PianoContiFormDialogComponent>);
  private readonly data: PianoContiFormData = inject(MAT_DIALOG_DATA);
  private readonly service = inject(PianoContiService);
  private readonly snackBar = inject(MatSnackBar);

  readonly tipi = TIPI;
  readonly isEdit = !!this.data.conto;
  readonly saving = signal(false);
  readonly errore = signal<string | null>(null);

  // Il conto in modifica non può essere padre di sé stesso.
  readonly parentOptions = this.data.conti.filter(c => c.id !== this.data.conto?.id);

  readonly form = new FormGroup({
    codice: new FormControl(this.data.conto?.codice ?? '', { nonNullable: true, validators: [Validators.required, Validators.maxLength(20)] }),
    descrizione: new FormControl(this.data.conto?.nome ?? '', { nonNullable: true, validators: [Validators.required, Validators.maxLength(255)] }),
    tipo: new FormControl<TipoCoge>(this.data.conto?.tipo ?? this.data.presetTipo ?? 'RICAVO', { nonNullable: true, validators: [Validators.required] }),
    parentId: new FormControl<number | null>(this.data.conto?.parentId ?? null),
  });

  close(): void {
    this.dialogRef.close(false);
  }

  salva(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.errore.set(null);
    const req: PianoContiCogeUpsertRequest = {
      codice: this.form.controls.codice.value.trim(),
      descrizione: this.form.controls.descrizione.value.trim(),
      tipo: this.form.controls.tipo.value,
      parentId: this.form.controls.parentId.value,
    };
    const call$ = this.isEdit
      ? this.service.update(this.data.conto!.id, req)
      : this.service.create(req);

    call$.subscribe({
      next: () => {
        this.snackBar.open(this.isEdit ? 'Conto aggiornato' : 'Conto creato', 'OK', { duration: 2500 });
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.saving.set(false);
        this.errore.set(err?.error?.message ?? 'Errore nel salvataggio. Riprova.');
      },
    });
  }
}
