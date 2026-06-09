import {
  Component,
  OnInit,
  OnDestroy,
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
import { InputFilterDirective } from '../../shared/directives/input-filter.directive';
import { DateMaskDirective } from '../../shared/directives/date-mask.directive';
import { AppValidators } from '../../shared/validators/app-validators';
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
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { CassaService } from '../../core/services/cassa.service';
import { LookupService } from '../../core/services/lookup.service';
import { CassaMovimentoDTO, CreateCassaMovimentoRequest } from '../../core/models/cassa.models';
import { ContoBancarioDTO, PianoContiCogeDTO } from '../../core/models/anagrafica.models';
import { CurrencyInputComponent } from '../../shared/components/currency-input/currency-input.component';
import { BuSelectorComponent } from '../../shared/components/bu-selector/bu-selector.component';

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
    MatAutocompleteModule,
    CurrencyInputComponent,
    BuSelectorComponent,
    InputFilterDirective,
    DateMaskDirective,
  ],
  templateUrl: './cassa-edit-dialog.component.html',
})
export class CassaEditDialogComponent implements OnInit, OnDestroy {
  private readonly dialogRef = inject(MatDialogRef<CassaEditDialogComponent>);
  private readonly data: CassaEditDialogData = inject(MAT_DIALOG_DATA);
  private readonly cassaService = inject(CassaService);
  private readonly lookupService = inject(LookupService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  readonly saving = signal(false);
  readonly contiBancari = this.data.contiBancari;

  // CoGe autocomplete
  filteredCoge = signal<PianoContiCogeDTO[]>([]);
  readonly cogeSearch = new FormControl<string>('', { nonNullable: true });
  private pianoContiAll: PianoContiCogeDTO[] = [];

  readonly form = new FormGroup({
    tipo:           new FormControl<string>('PRELIEVO_DA_BANCA', { nonNullable: true }),
    importo:        new FormControl<number | null>(null, [Validators.required, Validators.min(0.01)]),
    dataMovimento:  new FormControl<Date | null>(null, [Validators.required]),
    descrizione:    new FormControl<string | null>(null, [AppValidators.safeText()]),
    contoBancaId:   new FormControl<number | null>(null, [Validators.required]),
    businessUnitId: new FormControl<number | null>(null),
    contoCoge:      new FormControl<number | null>(null),
  });

  ngOnInit(): void {
    this.lookupService.getPianoConti().subscribe(piano => {
      this.pianoContiAll = piano;
      this.filteredCoge.set(piano);
      const existingId = this.data.movimento.contoCoge;
      if (existingId != null) {
        const found = piano.find(c => c.id === existingId);
        if (found) this.cogeSearch.setValue(`${found.nome} (${found.codice})`, { emitEvent: false });
      }
      this.cdr.markForCheck();
    });
    this.cogeSearch.valueChanges.pipe(
      debounceTime(150),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe(q => {
      const search = q.toLowerCase().trim();
      this.filteredCoge.set(
        search
          ? this.pianoContiAll.filter(c =>
              c.nome.toLowerCase().includes(search) || c.codice.toLowerCase().includes(search)
            )
          : this.pianoContiAll
      );
      this.cdr.markForCheck();
    });

    const m = this.data.movimento;
    const [y, mo, d] = m.dataMovimento.split('-').map(Number);
    this.form.patchValue({
      tipo:           m.tipo,
      importo:        m.importo,
      dataMovimento:  new Date(y, mo - 1, d),
      descrizione:    m.descrizione,
      contoBancaId:   m.contoBancaId,
      businessUnitId: m.businessUnitId,
      contoCoge:      m.contoCoge,
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onCogeSelected(event: MatAutocompleteSelectedEvent): void {
    const conto = event.option.value as PianoContiCogeDTO;
    this.form.controls.contoCoge.setValue(conto.id);
    this.cogeSearch.setValue(`${conto.nome} (${conto.codice})`, { emitEvent: false });
  }

  clearCoge(): void {
    this.form.controls.contoCoge.setValue(null);
    this.cogeSearch.setValue('');
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
      contoCoge:      v.contoCoge,
      businessUnitId: v.businessUnitId,
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
