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
import { InputFilterDirective } from '../../../shared/directives/input-filter.directive';
import { AppValidators } from '../../../shared/validators/app-validators';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { FornitoriService } from '../../../core/services/fornitori.service';
import { LookupService } from '../../../core/services/lookup.service';
import { FornitoreDTO, CreateFornitoreRequest, PianoContiCogeDTO } from '../../../core/models/anagrafica.models';
import { BuSelectorComponent } from '../../../shared/components/bu-selector/bu-selector.component';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader.component';

export interface FornitoreFormDialogData {
  fornitoreId?: string;
}

@Component({
  selector: 'app-fornitore-form-dialog',
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
    MatAutocompleteModule,
    BuSelectorComponent,
    SkeletonLoaderComponent,
    InputFilterDirective,
  ],
  templateUrl: './fornitore-form-dialog.component.html',
})
export class FornitoreFormDialogComponent implements OnInit, OnDestroy {
  private readonly dialogRef = inject(MatDialogRef<FornitoreFormDialogComponent>);
  private readonly data: FornitoreFormDialogData = inject(MAT_DIALOG_DATA);
  private readonly fornitoriService = inject(FornitoriService);
  private readonly lookupService = inject(LookupService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  readonly isEdit = signal(false);
  readonly loadingForm = signal(false);
  readonly saving = signal(false);

  // CoGe autocomplete state
  filteredCoge = signal<PianoContiCogeDTO[]>([]);
  readonly cogeSearch = new FormControl<string>('', { nonNullable: true });
  private pianoContiAll: PianoContiCogeDTO[] = [];

  readonly form = new FormGroup({
    ragioneSociale: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(255), AppValidators.safeText()] }),
    alias:          new FormControl<string | null>(null, [Validators.maxLength(100), AppValidators.safeText()]),
    piva:           new FormControl<string | null>(null, [Validators.maxLength(11), Validators.pattern(/^\d*$/)]),
    codiceSdi:      new FormControl<string | null>(null, [Validators.maxLength(7), AppValidators.alphanumeric()]),
    buDefaultId:    new FormControl<number | null>(null),
    cogeDefaultId:  new FormControl<number | null>(null),
    note:           new FormControl<string | null>(null, [AppValidators.safeText()]),
  });

  ngOnInit(): void {
    this.lookupService.getPianoConti().subscribe(piano => {
      this.pianoContiAll = piano;
      this.filteredCoge.set(piano);
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

    if (this.data.fornitoreId) {
      this.isEdit.set(true);
      this.loadingForm.set(true);
      this.fornitoriService.getById(this.data.fornitoreId).subscribe({
        next: f => {
          this.patchForm(f);
          this.loadingForm.set(false);
          this.cdr.markForCheck();
        },
        error: () => {
          this.loadingForm.set(false);
          this.snackBar.open('Errore nel caricamento del fornitore', 'OK', { duration: 3000 });
          this.cdr.markForCheck();
        },
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onCogeSelected(event: MatAutocompleteSelectedEvent): void {
    const conto = event.option.value as PianoContiCogeDTO;
    this.form.controls.cogeDefaultId.setValue(conto.id);
    this.cogeSearch.setValue(`${conto.nome} (${conto.codice})`, { emitEvent: false });
  }

  clearCoge(): void {
    this.form.controls.cogeDefaultId.setValue(null);
    this.cogeSearch.setValue('');
  }

  private patchForm(f: FornitoreDTO): void {
    this.form.patchValue({
      ragioneSociale: f.ragioneSociale,
      alias:          f.alias,
      piva:           f.piva,
      codiceSdi:      f.codiceSdi,
      buDefaultId:    f.buDefaultId,
      cogeDefaultId:  f.cogeDefaultId,
      note:           f.note,
    });
    if (f.cogeDefaultId != null) {
      const found = this.pianoContiAll.find(c => c.id === f.cogeDefaultId);
      if (found) {
        this.cogeSearch.setValue(`${found.nome} (${found.codice})`, { emitEvent: false });
      }
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const v = this.form.getRawValue();
    const body: CreateFornitoreRequest = {
      ragioneSociale: v.ragioneSociale,
      alias:          v.alias || null,
      piva:           v.piva || null,
      codiceSdi:      v.codiceSdi || null,
      buDefaultId:    v.buDefaultId,
      cogeDefaultId:  v.cogeDefaultId,
      note:           v.note || null,
    };

    const req$ = this.isEdit()
      ? this.fornitoriService.update(this.data.fornitoreId!, body)
      : this.fornitoriService.create(body);

    req$.subscribe({
      next: () => {
        this.saving.set(false);
        const msg = this.isEdit() ? 'Fornitore aggiornato' : 'Fornitore creato';
        this.snackBar.open(msg, 'OK', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: err => {
        this.saving.set(false);
        const msg = err?.status === 409
          ? 'Partita IVA già esistente'
          : 'Errore durante il salvataggio';
        this.snackBar.open(msg, 'OK', { duration: 4000 });
        this.cdr.markForCheck();
      },
    });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
