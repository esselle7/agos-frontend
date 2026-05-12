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
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, takeUntil } from 'rxjs';
import { PersonaleService } from '../../../core/services/personale.service';
import { BuService } from '../../../core/services/bu.service';
import { LookupService } from '../../../core/services/lookup.service';
import {
  PersonaleDTO,
  BusinessUnitDTO,
  CentroDiCostoDTO,
} from '../../../core/models';
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
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    SkeletonLoaderComponent,
  ],
  templateUrl: './personale-form-dialog.component.html',
})
export class PersonaleFormDialogComponent implements OnInit, OnDestroy {
  private readonly dialogRef = inject(MatDialogRef<PersonaleFormDialogComponent>);
  private readonly data: PersonaleFormDialogData = inject(MAT_DIALOG_DATA);
  private readonly service = inject(PersonaleService);
  private readonly buService = inject(BuService);
  private readonly lookupService = inject(LookupService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  readonly isEdit = signal(false);
  readonly loadingForm = signal(false);
  readonly saving = signal(false);

  buList = signal<BusinessUnitDTO[]>([]);
  cdcAll = signal<CentroDiCostoDTO[]>([]);
  cdcFiltered = signal<CentroDiCostoDTO[]>([]);

  readonly form = new FormGroup({
    nome:                  new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    cognome:               new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    mansione:              new FormControl<string | null>(null, [Validators.maxLength(100)]),
    businessUnitId:        new FormControl<number | null>(null),
    centroDiCostoId:       new FormControl<number | null>(null),
    costoAziendaleMensile: new FormControl<number | null>(null),
    isActive:              new FormControl<boolean>(true, { nonNullable: true }),
  });

  ngOnInit(): void {
    this.buService.getAll().subscribe(units => {
      this.buList.set(units);
      this.cdr.markForCheck();
    });

    this.lookupService.getCentriDiCosto().subscribe(cdc => {
      this.cdcAll.set(cdc);
      this.cdcFiltered.set(cdc);
      this.cdr.markForCheck();
    });

    this.form.controls.businessUnitId.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(buId => {
      const filtered = buId != null
        ? this.cdcAll().filter(c => c.businessUnitId === buId)
        : this.cdcAll();
      this.cdcFiltered.set(filtered);
      if (filtered.every(c => c.id !== this.form.controls.centroDiCostoId.value)) {
        this.form.controls.centroDiCostoId.setValue(null);
      }
      this.cdr.markForCheck();
    });

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
      centroDiCostoId:       p.centroDiCostoId,
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
      mansione:              v.mansione || null,
      businessUnitId:        v.businessUnitId,
      centroDiCostoId:       v.centroDiCostoId,
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
