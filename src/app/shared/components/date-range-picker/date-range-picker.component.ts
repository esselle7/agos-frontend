import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormControl, FormGroup } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DashboardPeriod } from '../../../core/models/dashboard.models';

export interface PeriodChangeEvent {
  period: DashboardPeriod;
  from?: string;
  to?: string;
}

@Component({
  selector: 'agos-date-range-picker',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTooltipModule,
  ],
  templateUrl: './date-range-picker.component.html',
  styleUrls: ['./date-range-picker.component.scss'],
})
export class DateRangePickerComponent implements OnInit {
  @Input() period: DashboardPeriod = 'MTD';
  @Input() from?: string;
  @Input() to?: string;
  @Output() periodChange = new EventEmitter<PeriodChangeEvent>();

  readonly periods: { value: DashboardPeriod; label: string; tooltip: string }[] = [
    { value: 'MTD',    label: 'MTD',          tooltip: 'Mese corrente' },
    { value: 'QTD',    label: 'QTD',          tooltip: 'Trimestre corrente' },
    { value: 'YTD',    label: 'YTD',          tooltip: 'Anno corrente' },
    { value: 'CUSTOM', label: 'Personalizzato', tooltip: 'Intervallo personalizzato' },
  ];

  customForm = new FormGroup({
    from: new FormControl<Date | null>(null),
    to:   new FormControl<Date | null>(null),
  });

  ngOnInit(): void {
    if (this.from) this.customForm.controls.from.setValue(new Date(this.from));
    if (this.to)   this.customForm.controls.to.setValue(new Date(this.to));
  }

  onPeriodClick(p: DashboardPeriod): void {
    this.period = p;
    if (p !== 'CUSTOM') {
      this.periodChange.emit({ period: p });
      return;
    }
    this.tryEmitCustom();
  }

  onCustomChange(): void {
    if (this.period === 'CUSTOM') this.tryEmitCustom();
  }

  private tryEmitCustom(): void {
    const { from, to } = this.customForm.value;
    if (from && to) {
      this.periodChange.emit({
        period: 'CUSTOM',
        from: this.toIso(from),
        to:   this.toIso(to),
      });
    }
  }

  private toIso(d: Date): string {
    return d.toISOString().slice(0, 10);
  }
}
