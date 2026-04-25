import {
  Component,
  Input,
  forwardRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'agos-currency-input',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule],
  templateUrl: './currency-input.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CurrencyInputComponent),
      multi: true,
    },
  ],
})
export class CurrencyInputComponent implements ControlValueAccessor {
  @Input() label = 'Importo';
  @Input() placeholder = '0,00';
  @Input() required = false;

  private readonly cdr = inject(ChangeDetectorRef);

  displayValue = '';
  disabled = false;

  private onChange: (v: number | null) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: number | null): void {
    this.displayValue = value !== null && value !== undefined
      ? new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
      : '';
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (v: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.cdr.markForCheck();
  }

  onInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    this.displayValue = raw;
    const parsed = this.parseItalian(raw);
    this.onChange(isNaN(parsed) ? null : parsed);
  }

  onBlur(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const parsed = this.parseItalian(raw);
    if (!isNaN(parsed)) {
      this.displayValue = new Intl.NumberFormat('it-IT', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(parsed);
      this.cdr.markForCheck();
    }
    this.onTouched();
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const text = event.clipboardData?.getData('text') ?? '';
    const cleaned = text.replace(/[^\d,.]/g, '');
    const parsed = this.parseItalian(cleaned);
    if (!isNaN(parsed)) {
      this.displayValue = new Intl.NumberFormat('it-IT', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(parsed);
      this.onChange(parsed);
      this.cdr.markForCheck();
    }
  }

  private parseItalian(raw: string): number {
    // Remove thousand separators (dots) and replace comma decimal with period
    const normalized = raw.replace(/\./g, '').replace(',', '.');
    return parseFloat(normalized);
  }
}
