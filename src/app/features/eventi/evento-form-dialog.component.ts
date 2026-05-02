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
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';
import { EventiService } from '../../core/services/eventi.service';
import { BuService } from '../../core/services/bu.service';
import { CurrencyInputComponent } from '../../shared/components/currency-input/currency-input.component';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { EventoCreateRequest, EventoDTO } from '../../core/models/eventi.models';
import { BusinessUnitDTO } from '../../core/models/anagrafica.models';

export interface EventoFormDialogData {
  eventoId?: string;
  dataPrecompilata?: string;
}

const TIPI_EVENTO = [
  { value: 'MATRIMONIO',          label: 'Matrimonio' },
  { value: 'BATTESIMO',           label: 'Battesimo' },
  { value: 'BANCHETTO_AZIENDALE', label: 'Banchetto Aziendale' },
  { value: 'COMUNIONE',           label: 'Comunione' },
  { value: 'ALTRO',               label: 'Altro' },
];

@Component({
  selector: 'app-evento-form-dialog',
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
    MatDatepickerModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    CurrencyInputComponent,
    SkeletonLoaderComponent,
  ],
  templateUrl: './evento-form-dialog.component.html',
})
export class EventoFormDialogComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<EventoFormDialogComponent>);
  private readonly data: EventoFormDialogData = inject(MAT_DIALOG_DATA);
  private readonly eventiService = inject(EventiService);
  private readonly buService = inject(BuService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly tipiEvento = TIPI_EVENTO;
  readonly isEdit = signal(false);
  readonly loadingForm = signal(false);
  readonly saving = signal(false);
  businessUnits = signal<BusinessUnitDTO[]>([]);

  readonly form = new FormGroup({
    nome:                         new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    tipo:                         new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    dataEvento:                   new FormControl<Date | null>(null, [Validators.required]),
    dataPreventivo:               new FormControl<Date | null>(null),
    importoTotalePreviventivato:  new FormControl<number | null>(null),
    businessUnitId:               new FormControl<number>(2, { nonNullable: true }),
    contattoNome:                 new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    contattoTelefono:             new FormControl<string | null>(null),
    contattoEmail:                new FormControl<string | null>(null, [Validators.email]),
    nOspiti:                      new FormControl<number | null>(null, [Validators.min(1)]),
    note:                         new FormControl<string | null>(null),
  });

  ngOnInit(): void {
    if (this.data.eventoId) {
      this.isEdit.set(true);
      this.loadingForm.set(true);
      forkJoin({
        bu:     this.buService.getAll(),
        evento: this.eventiService.getById(this.data.eventoId),
      }).subscribe({
        next: ({ bu, evento }) => {
          this.businessUnits.set(bu);
          this.patchForm(evento);
          this.loadingForm.set(false);
          this.cdr.markForCheck();
        },
        error: () => {
          this.loadingForm.set(false);
          this.snackBar.open('Errore nel caricamento dell\'evento', 'OK', { duration: 3000 });
          this.cdr.markForCheck();
        },
      });
    } else {
      this.buService.getAll().subscribe(bu => {
        this.businessUnits.set(bu);
        if (this.data.dataPrecompilata) {
          const [y, m, d] = this.data.dataPrecompilata.split('-').map(Number);
          this.form.controls.dataEvento.setValue(new Date(y, m - 1, d));
        }
        this.cdr.markForCheck();
      });
    }
  }

  private patchForm(ev: EventoDTO): void {
    const parseDate = (s: string | null): Date | null => {
      if (!s) return null;
      const [y, m, d] = s.split('-').map(Number);
      return new Date(y, m - 1, d);
    };
    this.form.patchValue({
      nome:                        ev.nome,
      tipo:                        ev.tipo,
      dataEvento:                  parseDate(ev.dataEvento),
      dataPreventivo:              parseDate(ev.dataPreventivo),
      importoTotalePreviventivato: ev.importoTotalePreviventivato,
      businessUnitId:              ev.businessUnitId,
      contattoNome:                ev.contattoNome,
      contattoTelefono:            ev.contattoTelefono,
      contattoEmail:               ev.contattoEmail,
      nOspiti:                     ev.nOspiti,
      note:                        ev.note,
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const v = this.form.getRawValue();
    const body: EventoCreateRequest = {
      nome:                        v.nome,
      tipo:                        v.tipo,
      dataEvento:                  this.dateToIso(v.dataEvento!),
      dataPreventivo:              v.dataPreventivo ? this.dateToIso(v.dataPreventivo) : null,
      importoTotalePreviventivato: v.importoTotalePreviventivato,
      contattoNome:                v.contattoNome,
      contattoTelefono:            v.contattoTelefono ?? null,
      contattoEmail:               v.contattoEmail ?? null,
      nOspiti:                     v.nOspiti,
      note:                        v.note ?? null,
      businessUnitId:              v.businessUnitId,
    };

    const req$ = this.isEdit()
      ? this.eventiService.update(this.data.eventoId!, body)
      : this.eventiService.create(body);

    req$.subscribe({
      next: () => {
        this.saving.set(false);
        const msg = this.isEdit() ? 'Evento aggiornato' : 'Evento creato';
        this.snackBar.open(msg, 'OK', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: () => {
        this.saving.set(false);
        this.snackBar.open('Errore durante il salvataggio', 'OK', { duration: 3000 });
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
