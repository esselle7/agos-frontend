import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SpeseRicorrentiService } from '../../core/services/spese-ricorrenti.service';
import { CogeOption } from './spese-ricorrenti.models';
import { ContoBancarioDTO } from '../../core/models/anagrafica.models';

interface PianoPreview {
  primaRata: string;
  ultimaRata: string;
  totale: string;
  variabile: boolean;
}

@Component({
  selector: 'app-spese-ricorrenti-create-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatDialogModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatProgressSpinnerModule, MatTooltipModule,
  ],
  templateUrl: './spese-ricorrenti-create-dialog.component.html',
  styleUrls: ['./spese-ricorrenti-create-dialog.component.scss'],
})
export class SpeseRicorrentiCreateDialogComponent implements OnInit {
  private readonly service   = inject(SpeseRicorrentiService);
  private readonly fb        = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<SpeseRicorrentiCreateDialogComponent>);

  readonly contiCoge     = signal<CogeOption[]>([]);
  readonly contiBancari  = signal<ContoBancarioDTO[]>([]);
  readonly saving        = signal(false);
  readonly loadingLookup = signal(true);

  form!: FormGroup;

  // Mesi e anni per il picker mese/anno
  readonly mesi = [
    { v: '01', l: 'Gennaio'   }, { v: '02', l: 'Febbraio'  },
    { v: '03', l: 'Marzo'     }, { v: '04', l: 'Aprile'    },
    { v: '05', l: 'Maggio'    }, { v: '06', l: 'Giugno'    },
    { v: '07', l: 'Luglio'    }, { v: '08', l: 'Agosto'    },
    { v: '09', l: 'Settembre' }, { v: '10', l: 'Ottobre'   },
    { v: '11', l: 'Novembre'  }, { v: '12', l: 'Dicembre'  },
  ];

  readonly anni: number[] = (() => {
    const y = new Date().getFullYear();
    return [y - 1, y, y + 1, y + 2, y + 3];
  })();

  readonly frequenzaOptions = [
    { value: 'MENSILE',     label: 'Mensile',     sub: 'ogni mese'    },
    { value: 'BIMESTRALE',  label: 'Bimestrale',  sub: 'ogni 2 mesi'  },
    { value: 'TRIMESTRALE', label: 'Trimestrale', sub: 'ogni 3 mesi'  },
  ];

  ngOnInit(): void {
    const now = new Date();
    const nextMonth = now.getMonth() + 1; // 0-based → next month index (0-based)
    const meseDefault = String((nextMonth % 12) + 1).padStart(2, '0');
    const annoDefault = nextMonth >= 12 ? now.getFullYear() + 1 : now.getFullYear();

    this.form = this.fb.group({
      descrizione:      ['', [Validators.required, Validators.maxLength(255)]],
      contoBancarioId:  [null, Validators.required],
      contoCoge:        [null, Validators.required],
      importoRata:      [null, [Validators.required, Validators.min(0.01)]],
      variazionePct:    [0],
      giornoDelMese:    [null, [Validators.required, Validators.min(1), Validators.max(28)]],
      frequenza:        ['MENSILE', Validators.required],
      numeroRate:       [null, [Validators.required, Validators.min(1)]],
      meseInizio:       [meseDefault, Validators.required],
      annoInizio:       [annoDefault, Validators.required],
      note:             [''],
    });

    this.service.getContiCoge().subscribe({
      next: d => { this.contiCoge.set(d); this.checkLoaded(); },
    });
    this.service.getContiBancari().subscribe({
      next: d => { this.contiBancari.set(d); this.checkLoaded(); },
    });
  }

  private loaded = 0;
  private checkLoaded(): void {
    if (++this.loaded >= 2) this.loadingLookup.set(false);
  }

  preview(): PianoPreview | null {
    const v = this.form.value;
    const { annoInizio, meseInizio, giornoDelMese, numeroRate, importoRata, variazionePct, frequenza } = v;
    if (!annoInizio || !meseInizio || !giornoDelMese || !numeroRate || !importoRata) return null;
    if (giornoDelMese < 1 || giornoDelMese > 28 || numeroRate < 1 || importoRata <= 0) return null;

    const mesiPerRata = frequenza === 'BIMESTRALE' ? 2 : frequenza === 'TRIMESTRALE' ? 3 : 1;
    const primaData   = new Date(annoInizio, Number(meseInizio) - 1, giornoDelMese);
    const ultimaData  = new Date(annoInizio, Number(meseInizio) - 1 + (numeroRate - 1) * mesiPerRata, giornoDelMese);
    const totale      = importoRata * numeroRate;
    const fmt         = (d: Date) => d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
    const fmtEur      = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);

    return {
      primaRata: fmt(primaData),
      ultimaRata: fmt(ultimaData),
      totale: fmtEur(totale),
      variabile: (variazionePct ?? 0) !== 0,
    };
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);

    const v = this.form.value;
    const mm = String(v.meseInizio).padStart(2, '0');
    this.service.createPlan({
      descrizione:     v.descrizione,
      contoBancarioId: v.contoBancarioId,
      contoCoge:       v.contoCoge,
      importoRata:     v.importoRata,
      variazionePct:   v.variazionePct ?? 0,
      giornoDelMese:   v.giornoDelMese,
      frequenza:       v.frequenza,
      numeroRate:      v.numeroRate,
      dataInizio:      `${v.annoInizio}-${mm}-01`,
      note:            v.note || undefined,
    }).subscribe({
      next: created => this.dialogRef.close(created),
      error: ()      => this.saving.set(false),
    });
  }

  close(): void { this.dialogRef.close(null); }
}
