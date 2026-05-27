import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EventiService } from '../../../core/services/eventi.service';
import {
  EventoDTO,
  EventoPreventivoTrackingDTO,
  EventoPreventivoTrackingRequest,
} from '../../../core/models/eventi.models';
import { EuroPipe } from '../../../shared/pipes/euro.pipe';
import { CurrencyInputComponent } from '../../../shared/components/currency-input/currency-input.component';

@Component({
  selector: 'app-evento-preventivo-monitoring',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    DecimalPipe,
    EuroPipe,
    CurrencyInputComponent,
  ],
  templateUrl: './evento-preventivo-monitoring.component.html',
  styleUrls: ['./evento-preventivo-monitoring.component.scss'],
})
export class EventoPreventivoMonitoringComponent implements OnInit, OnChanges {
  @Input({ required: true }) evento!: EventoDTO;
  @Output() updated = new EventEmitter<void>();

  private readonly eventiService = inject(EventiService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly cdr = inject(ChangeDetectorRef);

  loading        = signal(true);
  savingAffitto  = signal(false);
  savingCatering = signal(false);
  editingPersone = signal(false);
  savingPersone  = signal(false);

  /**
   * Numero effettivo di partecipanti usato per i calcoli catering.
   * Viene sincronizzato con evento.numeroTotalePartecipanti ogni volta
   * che l'input cambia (OnChanges), così i computed restano reattivi.
   */
  readonly numPersoneEff = signal<number>(0);

  /** FormControl standalone per il campo di edit nel chip. */
  readonly personeDraftControl = new FormControl<number | null>(null);

  affitto = signal<EventoPreventivoTrackingDTO | null>(null);
  catering = signal<EventoPreventivoTrackingDTO | null>(null);

  readonly affittoForm = new FormGroup({
    importoIncasso: new FormControl<number | null>(null),
    note:           new FormControl<string | null>(null),
  });

  readonly cateringForm = new FormGroup({
    costoPerPersona:  new FormControl<number | null>(null),
    prezzoPerPersona: new FormControl<number | null>(null),
    note:             new FormControl<string | null>(null),
  });

  private readonly cateringValues = toSignal(this.cateringForm.valueChanges, {
    initialValue: this.cateringForm.getRawValue(),
  });
  private readonly affittoValues = toSignal(this.affittoForm.valueChanges, {
    initialValue: this.affittoForm.getRawValue(),
  });

  readonly preventivato = computed(() => this.evento?.importoTotalePreviventivato ?? 0);

  /** Anteprima catering — usa numPersoneEff() come sorgente reattiva. */
  readonly cateringPreview = computed(() => {
    const v = this.cateringValues();
    const n = this.numPersoneEff();
    const costo = (v.costoPerPersona ?? 0) * n;
    const ricavo = (v.prezzoPerPersona ?? 0) * n;
    const margine = ricavo - costo;
    const marginePerc = ricavo > 0 ? (margine / ricavo) * 100 : null;
    return { costo, ricavo, margine, marginePerc };
  });

  /** Scomposizione del preventivato. */
  readonly breakdown = computed(() => {
    const tot = this.preventivato();
    const affittoIncasso = this.affittoValues().importoIncasso ?? 0;
    const cateringRicavo = this.cateringPreview().ricavo;
    const residuo = tot - affittoIncasso - cateringRicavo;
    return { tot, affittoIncasso, cateringRicavo, residuo };
  });

  /** Larghezze % dei segmenti nella barra visiva. */
  readonly barWidths = computed(() => {
    const b = this.breakdown();
    const a = Math.max(0, b.affittoIncasso);
    const c = Math.max(0, b.cateringRicavo);
    const r = Math.max(0, b.residuo);
    const sum = a + c + r;
    if (sum <= 0) return { affitto: 0, catering: 0, residuo: 100 };
    return {
      affitto:  (a / sum) * 100,
      catering: (c / sum) * 100,
      residuo:  (r / sum) * 100,
    };
  });

  ngOnInit(): void {
    this.numPersoneEff.set(this.evento.numeroTotalePartecipanti ?? 0);
    this.load();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Quando il parent ricarica l'evento (es. dopo updatePartecipanti),
    // aggiorniamo il signal così cateringPreview si ricalcola.
    if (changes['evento'] && !changes['evento'].firstChange) {
      const v: EventoDTO = changes['evento'].currentValue;
      this.numPersoneEff.set(v.numeroTotalePartecipanti ?? 0);
    }
  }

  private load(): void {
    this.loading.set(true);
    this.eventiService.getPreventivoTracking(this.evento.id).subscribe({
      next: list => {
        const a = list.find(t => t.tipo === 'AFFITTO') ?? null;
        const c = list.find(t => t.tipo === 'CATERING') ?? null;
        this.affitto.set(a);
        this.catering.set(c);
        if (a) this.affittoForm.patchValue({ importoIncasso: a.importoIncasso ?? null, note: a.note ?? null });
        if (c) this.cateringForm.patchValue({
          costoPerPersona:  c.costoPerPersona ?? null,
          prezzoPerPersona: c.prezzoPerPersona ?? null,
          note:             c.note ?? null,
        });
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Errore nel caricamento del monitoring', 'OK', { duration: 3000 });
        this.cdr.markForCheck();
      },
    });
  }

  // ── Partecipanti edit ────────────────────────────────────────────────

  startEditPersone(): void {
    this.personeDraftControl.setValue(this.numPersoneEff());
    this.editingPersone.set(true);
  }

  cancelEditPersone(): void {
    this.editingPersone.set(false);
  }

  savePersone(): void {
    const n = this.personeDraftControl.value;
    if (!n || n <= 0) {
      this.snackBar.open('Inserisci un numero di partecipanti valido', 'OK', { duration: 3000 });
      return;
    }
    this.savingPersone.set(true);
    // Aggiorna direttamente il campo evento — non solo il tracking catering
    this.eventiService.update(this.evento.id, { numeroTotalePartecipanti: n }).subscribe({
      next: () => {
        this.numPersoneEff.set(n);   // aggiorna subito i calcoli
        this.editingPersone.set(false);
        this.savingPersone.set(false);
        this.snackBar.open('Partecipanti aggiornati', 'OK', { duration: 2500 });
        this.updated.emit();         // il parent ricarica l'evento → tutte le sezioni si aggiornano
        this.cdr.markForCheck();
      },
      error: () => {
        this.savingPersone.set(false);
        this.snackBar.open('Errore nel salvataggio', 'OK', { duration: 3000 });
        this.cdr.markForCheck();
      },
    });
  }

  // ── Affitto / Catering ───────────────────────────────────────────────

  salvaAffitto(): void {
    const v = this.affittoForm.getRawValue();
    if (v.importoIncasso == null || v.importoIncasso < 0) {
      this.snackBar.open('Inserisci l\'incasso dell\'affitto', 'OK', { duration: 3000 });
      return;
    }
    const req: EventoPreventivoTrackingRequest = {
      tipo: 'AFFITTO',
      importoIncasso: v.importoIncasso,
      note: v.note ?? null,
    };
    this.savingAffitto.set(true);
    this.eventiService.savePreventivoTracking(this.evento.id, req).subscribe({
      next: dto => {
        this.affitto.set(dto);
        this.savingAffitto.set(false);
        this.snackBar.open('Affitto aggiornato', 'OK', { duration: 2500 });
        this.updated.emit();
        this.cdr.markForCheck();
      },
      error: () => {
        this.savingAffitto.set(false);
        this.snackBar.open('Errore nel salvataggio', 'OK', { duration: 3000 });
        this.cdr.markForCheck();
      },
    });
  }

  salvaCatering(): void {
    const v = this.cateringForm.getRawValue();
    if (v.costoPerPersona == null || v.costoPerPersona < 0) {
      this.snackBar.open('Inserisci il costo per persona', 'OK', { duration: 3000 });
      return;
    }
    const req: EventoPreventivoTrackingRequest = {
      tipo: 'CATERING',
      costoPerPersona: v.costoPerPersona,
      prezzoPerPersona: v.prezzoPerPersona ?? null,
      numPersone: this.numPersoneEff(),
      note: v.note ?? null,
    };
    this.savingCatering.set(true);
    this.eventiService.savePreventivoTracking(this.evento.id, req).subscribe({
      next: dto => {
        this.catering.set(dto);
        this.savingCatering.set(false);
        this.snackBar.open('Catering aggiornato', 'OK', { duration: 2500 });
        this.updated.emit();
        this.cdr.markForCheck();
      },
      error: () => {
        this.savingCatering.set(false);
        this.snackBar.open('Errore nel salvataggio', 'OK', { duration: 3000 });
        this.cdr.markForCheck();
      },
    });
  }

  rimuovi(t: EventoPreventivoTrackingDTO | null): void {
    if (!t) return;
    this.eventiService.deletePreventivoTracking(this.evento.id, t.id).subscribe({
      next: () => {
        if (t.tipo === 'AFFITTO') { this.affitto.set(null); this.affittoForm.reset(); }
        else {
          this.catering.set(null);
          this.cateringForm.reset();
          this.editingPersone.set(false);
        }
        this.snackBar.open('Voce rimossa', 'OK', { duration: 2500 });
        this.updated.emit();
        this.cdr.markForCheck();
      },
      error: () => this.snackBar.open('Errore durante la rimozione', 'OK', { duration: 3000 }),
    });
  }
}
