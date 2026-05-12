import {
  Component,
  OnInit,
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
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';
import { EventiService } from '../../core/services/eventi.service';
import { BuService } from '../../core/services/bu.service';
import { LookupService } from '../../core/services/lookup.service';
import { CurrencyInputComponent } from '../../shared/components/currency-input/currency-input.component';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { EventoCreateRequest, EventoDTO } from '../../core/models/eventi.models';
import { BusinessUnitDTO, TipoEventoDTO } from '../../core/models/anagrafica.models';

export interface EventoFormDialogData {
  eventoId?: string;
  dataPrecompilata?: string;
}

const ALLERGIE_COMUNI = [
  'Glutine', 'Lattosio', 'Uova', 'Pesce', 'Crostacei',
  'Arachidi', 'Soia', 'Frutta a guscio', 'Sedano',
  'Senape', 'Sesamo', 'Solfiti', 'Lupini', 'Molluschi',
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
    MatTooltipModule,
    CurrencyInputComponent,
    SkeletonLoaderComponent,
  ],
  templateUrl: './evento-form-dialog.component.html',
  styles: [`
    .allergie-section { width: 100%; }
    .allergie-label { font-size: 13px; color: #6b7280; margin: 0 0 8px; font-weight: 600; }
    .allergie-comuni-grid {
      display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px;
    }
    .allergia-toggle {
      padding: 4px 12px; border-radius: 16px; border: 1.5px solid #e5e7eb;
      background: #f9fafb; font-size: 13px; cursor: pointer; font-family: inherit;
      color: #374151; transition: all .15s ease; line-height: 1.4;
    }
    .allergia-toggle:hover { border-color: #f57c00; color: #f57c00; }
    .allergia-toggle.active {
      background: #fff3e0; border-color: #f57c00; color: #e65100; font-weight: 600;
    }
    .allergie-custom-list { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
    .allergia-custom-chip {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 10px; border-radius: 14px;
      background: #fce4ec; border: 1px solid #f48fb1; color: #c62828;
      font-size: 12px; font-weight: 600;
    }
    .allergia-custom-chip button {
      background: none; border: none; cursor: pointer; padding: 0; line-height: 1;
      color: #c62828; font-size: 16px; display: flex; align-items: center;
    }
    .allergie-input-row { display: flex; align-items: center; gap: 8px; }
    .bu-display {
      display: flex; align-items: center; gap: 8px; padding: 10px 14px;
      border-radius: 8px; background: #f3f4f6; border: 1px solid #e5e7eb;
      font-size: 14px; color: #374151;
    }
    .bu-display mat-icon { font-size: 18px; width: 18px; height: 18px; color: #9ca3af; }
    .bu-name { font-weight: 600; }
  `],
})
export class EventoFormDialogComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<EventoFormDialogComponent>);
  private readonly data: EventoFormDialogData = inject(MAT_DIALOG_DATA);
  private readonly eventiService = inject(EventiService);
  private readonly buService = inject(BuService);
  private readonly lookupService = inject(LookupService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly allergieComuni = ALLERGIE_COMUNI;
  tipiEvento = signal<TipoEventoDTO[]>([]);

  readonly isEdit = signal(false);
  readonly loadingForm = signal(false);
  readonly saving = signal(false);
  readonly selectedBu = signal<BusinessUnitDTO | null>(null);

  allergie = signal<string[]>([]);
  readonly allergieCustom = computed(() =>
    this.allergie().filter(a => !ALLERGIE_COMUNI.includes(a))
  );

  readonly allergiaInputControl = new FormControl<string>('', { nonNullable: true });

  readonly form = new FormGroup({
    nome:                         new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    tipo:                         new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    dataEvento:                   new FormControl<Date | null>(null, [Validators.required]),
    dataPreventivo:               new FormControl<Date | null>(null),
    importoTotalePreviventivato:  new FormControl<number | null>(null),
    businessUnitId:               new FormControl<number | null>(null, [Validators.required]),
    contattoNome:                 new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    contattoTelefono:             new FormControl<string | null>(null),
    contattoEmail:                new FormControl<string | null>(null, [Validators.email]),
    numeroTotalePartecipanti:     new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
    numeroBambini:                new FormControl<number | null>(null, [Validators.min(0)]),
    note:                         new FormControl<string | null>(null),
  });

  ngOnInit(): void {
    if (this.data.eventoId) {
      this.isEdit.set(true);
      this.loadingForm.set(true);
      forkJoin({
        bu:     this.buService.getAll(),
        tipi:   this.lookupService.getTipiEvento(),
        evento: this.eventiService.getById(this.data.eventoId),
      }).subscribe({
        next: ({ bu, tipi, evento }) => {
          this.tipiEvento.set(tipi);
          this.applyBu(bu, evento.businessUnitId);
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
      forkJoin({
        bu:   this.buService.getAll(),
        tipi: this.lookupService.getTipiEvento(),
      }).subscribe({
        next: ({ bu, tipi }) => {
          this.tipiEvento.set(tipi);
          this.applyBu(bu, null);
          this.form.controls.dataPreventivo.setValue(new Date());
          if (this.data.dataPrecompilata) {
            const [y, m, d] = this.data.dataPrecompilata.split('-').map(Number);
            this.form.controls.dataEvento.setValue(new Date(y, m - 1, d));
          }
          this.cdr.markForCheck();
        },
        error: () => {
          this.snackBar.open('Errore nel caricamento dei dati', 'OK', { duration: 3000 });
          this.cdr.markForCheck();
        },
      });
    }
  }

  // Cerca la BU "Cerimonie" e la imposta; in edit usa l'id già salvato sull'evento
  private applyBu(buList: BusinessUnitDTO[], existingId: number | null): void {
    const target = existingId != null
      ? buList.find(b => b.id === existingId)
      : buList.find(b => b.nome.toLowerCase().includes('cerimoni'));
    if (target) {
      this.selectedBu.set(target);
      this.form.controls.businessUnitId.setValue(target.id);
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
      contattoNome:                ev.contattoNome,
      contattoTelefono:            ev.contattoTelefono,
      contattoEmail:               ev.contattoEmail,
      numeroTotalePartecipanti:    ev.numeroTotalePartecipanti,
      numeroBambini:               ev.numeroBambini,
      note:                        ev.note,
    });
    this.allergie.set([...(ev.allergie ?? [])]);
  }

  hasAllergia(a: string): boolean {
    return this.allergie().includes(a);
  }

  toggleAllergia(a: string): void {
    if (this.hasAllergia(a)) {
      this.allergie.set(this.allergie().filter(x => x !== a));
    } else {
      this.allergie.set([...this.allergie(), a]);
    }
  }

  addAllergia(): void {
    const val = this.allergiaInputControl.value.trim();
    if (!val || this.hasAllergia(val)) return;
    this.allergie.set([...this.allergie(), val]);
    this.allergiaInputControl.setValue('');
  }

  removeAllergia(allergia: string): void {
    this.allergie.set(this.allergie().filter(a => a !== allergia));
  }

  onAllergiaKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addAllergia();
    }
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
      numeroTotalePartecipanti:    v.numeroTotalePartecipanti!,
      numeroBambini:               v.numeroBambini ?? null,
      allergie:                    this.allergie(),
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
