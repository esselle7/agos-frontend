import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import {
  ReactiveFormsModule,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { InputFilterDirective } from '../../../shared/directives/input-filter.directive';
import { AppValidators } from '../../../shared/validators/app-validators';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, takeUntil } from 'rxjs';
import { PersonaleService } from '../../../core/services/personale.service';
import { BuService } from '../../../core/services/bu.service';
import { MansioneDTO, PersonaleDTO, BusinessUnitDTO } from '../../../core/models';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader.component';

export interface PersonaleFormDialogData {
  personaleId?: string;
}

@Component({
  selector: 'app-personale-form-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    SkeletonLoaderComponent,
    InputFilterDirective,
  ],
  templateUrl: './personale-form-dialog.component.html',
})
export class PersonaleFormDialogComponent implements OnInit, OnDestroy {
  private readonly dialogRef = inject(MatDialogRef<PersonaleFormDialogComponent>);
  private readonly data: PersonaleFormDialogData = inject(MAT_DIALOG_DATA);
  private readonly service = inject(PersonaleService);
  private readonly buService = inject(BuService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  readonly isEdit = signal(false);
  readonly loadingForm = signal(false);
  readonly saving = signal(false);

  buList = signal<BusinessUnitDTO[]>([]);
  mansioni = signal<MansioneDTO[]>([]);

  /** Mansioni filtrate in base al testo digitato nel campo autocomplete. */
  readonly mansioniFiltered = computed(() => {
    const val = (this.form.controls.mansione.value ?? '').toLowerCase();
    if (!val) return this.mansioni();
    return this.mansioni().filter(m => m.nome.toLowerCase().includes(val));
  });

  /** True se il testo digitato non corrisponde esattamente a nessuna mansione esistente. */
  readonly mansioneIsNew = computed(() => {
    const val = (this.form.controls.mansione.value ?? '').trim();
    if (!val) return false;
    return !this.mansioni().some(m => m.nome.toLowerCase() === val.toLowerCase());
  });

  readonly form = new FormGroup({
    nome:                  new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100), AppValidators.onlyLetters()] }),
    cognome:               new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100), AppValidators.onlyLetters()] }),
    mansione:              new FormControl<string | null>(null, [Validators.maxLength(100), AppValidators.safeText()]),
    businessUnitId:        new FormControl<number | null>(null),
    costoAziendaleMensile: new FormControl<number | null>(null, [Validators.min(0)]),
    isActive:              new FormControl<boolean>(true, { nonNullable: true }),
  });

  ngOnInit(): void {
    this.buService.getAll().subscribe(units => {
      this.buList.set(units);
      this.cdr.markForCheck();
    });

    this.service.getMansioni().subscribe(list => {
      this.mansioni.set(list);
      this.cdr.markForCheck();
    });

    // Trigger recompute of filtered list on value change
    this.form.controls.mansione.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.cdr.markForCheck());

    if (this.data.personaleId) {
      this.isEdit.set(true);
      this.loadingForm.set(true);
      this.service.getById(this.data.personaleId).subscribe({
        next: p => {
          this.patchForm(p);
          this.loadingForm.set(false);
          this.cdr.markForCheck();
        },
        error: () => {
          this.loadingForm.set(false);
          this.snackBar.open('Errore nel caricamento del dipendente', 'OK', { duration: 3000 });
          this.cdr.markForCheck();
        },
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private patchForm(p: PersonaleDTO): void {
    this.form.patchValue({
      nome:                  p.nome,
      cognome:               p.cognome,
      mansione:              p.mansione,
      businessUnitId:        p.businessUnitId,
      costoAziendaleMensile: p.costoAziendaleMensile,
      isActive:              p.isActive,
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const v = this.form.getRawValue();
    const body = {
      nome:                  v.nome,
      cognome:               v.cognome,
      mansione:              v.mansione?.trim() || null,
      businessUnitId:        v.businessUnitId,
      costoAziendaleMensile: v.costoAziendaleMensile,
      isActive:              v.isActive,
    };

    const req$ = this.isEdit()
      ? this.service.update(this.data.personaleId!, body)
      : this.service.create(body);

    req$.subscribe({
      next: () => {
        this.saving.set(false);
        this.snackBar.open(
          this.isEdit() ? 'Dipendente aggiornato' : 'Dipendente creato',
          'OK',
          { duration: 3000 }
        );
        this.dialogRef.close(true);
      },
      error: () => {
        this.saving.set(false);
        this.snackBar.open('Errore durante il salvataggio', 'OK', { duration: 4000 });
        this.cdr.markForCheck();
      },
    });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
