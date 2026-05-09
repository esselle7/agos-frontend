import {
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ReactiveFormsModule,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';

import { ReportingService } from '../../core/services/reporting.service';
import { BuSelectorComponent } from '../../shared/components/bu-selector/bu-selector.component';

const MESI_NOMI = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];

@Component({
  selector: 'app-export',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressBarModule,
    MatSelectModule,
    BuSelectorComponent,
  ],
  templateUrl: './export.component.html',
  styleUrls: ['./export.component.scss'],
})
export class ExportComponent implements OnInit {
  private readonly reportingSvc = inject(ReportingService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly snackBar = inject(MatSnackBar);

  readonly mesi = MESI_NOMI.map((nome, i) => ({ id: i + 1, nome }));
  readonly anni: number[] = [];

  readonly downloadingMovimenti = signal(false);
  readonly downloadingCommercialista = signal(false);
  readonly downloadingPl = signal(false);

  readonly movimentiForm = new FormGroup({
    from:   new FormControl<Date | null>(null, Validators.required),
    to:     new FormControl<Date | null>(null, Validators.required),
    format: new FormControl<'csv' | 'xlsx'>('xlsx', { nonNullable: true }),
  });

  readonly commercialistaForm = new FormGroup({
    mese: new FormControl<number | null>(null, Validators.required),
    anno: new FormControl<number | null>(null, Validators.required),
  });

  readonly plBuForm = new FormGroup({
    buId: new FormControl<number | null>(null, Validators.required),
    from: new FormControl<Date | null>(null, Validators.required),
    to:   new FormControl<Date | null>(null, Validators.required),
  });

  ngOnInit(): void {
    const currentYear = new Date().getFullYear();
    for (let i = 0; i < 4; i++) this.anni.push(currentYear - i);
    this.commercialistaForm.patchValue({
      mese: new Date().getMonth() + 1,
      anno: currentYear,
    });
  }

  downloadMovimenti(): void {
    if (this.movimentiForm.invalid) { this.movimentiForm.markAllAsTouched(); return; }
    const v = this.movimentiForm.getRawValue();
    const from   = this.toIso(v.from!);
    const to     = this.toIso(v.to!);
    const format = v.format;
    this.downloadingMovimenti.set(true);
    this.snackBar.open('Download in corso…', undefined, { duration: 2000 });
    this.reportingSvc.exportMovimenti(from, to, format)
      .pipe(
        catchError(err => {
          const msg = err?.error?.code === 'RANGE_TOO_LARGE'
            ? 'Intervallo troppo ampio (max 5 anni)'
            : 'Errore durante il download';
          this.snackBar.open(msg, 'OK', { duration: 4000 });
          this.downloadingMovimenti.set(false);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(blob => {
        if (blob) {
          this.reportingSvc.downloadBlob(blob, `movimenti-${from}_${to}.${format}`);
          this.snackBar.open('Download completato', 'OK', { duration: 3000 });
        }
        this.downloadingMovimenti.set(false);
      });
  }

  downloadCommercialista(): void {
    if (this.commercialistaForm.invalid) { this.commercialistaForm.markAllAsTouched(); return; }
    const v = this.commercialistaForm.getRawValue();
    this.downloadingCommercialista.set(true);
    this.snackBar.open('Download in corso…', undefined, { duration: 2000 });
    this.reportingSvc.exportCommercialista(v.mese!, v.anno!)
      .pipe(
        catchError(() => {
          this.snackBar.open('Errore durante il download', 'OK', { duration: 4000 });
          this.downloadingCommercialista.set(false);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(blob => {
        if (blob) {
          const meseName = this.mesi.find(m => m.id === v.mese!)?.nome?.toLowerCase() ?? v.mese;
          this.reportingSvc.downloadBlob(blob, `commercialista-${meseName}-${v.anno}.xlsx`);
          this.snackBar.open('Download completato', 'OK', { duration: 3000 });
        }
        this.downloadingCommercialista.set(false);
      });
  }

  downloadPl(): void {
    if (this.plBuForm.invalid) { this.plBuForm.markAllAsTouched(); return; }
    const v    = this.plBuForm.getRawValue();
    const from = this.toIso(v.from!);
    const to   = this.toIso(v.to!);
    this.downloadingPl.set(true);
    this.snackBar.open('Download in corso…', undefined, { duration: 2000 });
    this.reportingSvc.exportPlBu(v.buId!, from, to)
      .pipe(
        catchError(err => {
          const msg = err?.error?.code === 'RANGE_TOO_LARGE'
            ? 'Intervallo troppo ampio (max 5 anni)'
            : 'Errore durante il download';
          this.snackBar.open(msg, 'OK', { duration: 4000 });
          this.downloadingPl.set(false);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(blob => {
        if (blob) {
          this.reportingSvc.downloadBlob(blob, `pl-bu${v.buId}-${from}_${to}.xlsx`);
          this.snackBar.open('Download completato', 'OK', { duration: 3000 });
        }
        this.downloadingPl.set(false);
      });
  }

  private toIso(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
