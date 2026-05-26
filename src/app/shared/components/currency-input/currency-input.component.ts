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

  onKeyDown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey) return;
    const ALLOWED = new Set([
      'Backspace','Delete','Tab','Escape','Enter',
      'ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End',
    ]);
    if (ALLOWED.has(event.key)) return;
    if (/^\d$/.test(event.key)) return;
    if (event.key === ',') {
      // allow only if the field doesn't already contain a comma
      if (!(event.target as HTMLInputElement).value.includes(',')) return;
    }
    // dot is never typed: it appears only in the formatted display value (thousands separator)
    event.preventDefault();
  }

  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const sanitized = this.sanitizeRaw(input.value);
    if (sanitized !== input.value) {
      const pos = Math.min(input.selectionStart ?? sanitized.length, sanitized.length);
      input.value = sanitized;
      input.setSelectionRange(pos, pos);
    }
    this.displayValue = input.value;
    const parsed = this.parseItalian(input.value);
    this.onChange(isNaN(parsed) ? null : parsed);
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const text = event.clipboardData?.getData('text') ?? '';
    const sanitized = this.sanitizeRaw(text);
    const parsed = this.parseItalian(sanitized);
    if (!isNaN(parsed)) {
      this.displayValue = new Intl.NumberFormat('it-IT', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(parsed);
      this.onChange(parsed);
      this.cdr.markForCheck();
    }
  }

  // Strips invalid chars; enforces single decimal comma; collapses stray dots.
  private sanitizeRaw(raw: string): string {
    let s = raw.replace(/[^\d,.]/g, '');
    s = s.replace(/^\.+/, '');         // no leading dots
    s = s.replace(/\.{2,}/g, '.');     // collapse consecutive dots
    const ci = s.indexOf(',');
    if (ci !== -1) {
      // after the decimal comma only digits are valid
      s = s.substring(0, ci + 1) + s.substring(ci + 1).replace(/[,.]/g, '');
    }
    return s;
  }

  private parseItalian(raw: string): number {
    // dots are thousands separators → remove; comma is decimal → convert to dot
    const stripped = raw.replace(/\./g, '');
    const normalized = stripped.replace(/,/g, '.');
    // more than one dot means malformed input (e.g. "1,2,3" → "1.2.3")
    if ((normalized.match(/\./g)?.length ?? 0) > 1) return NaN;
    return parseFloat(normalized);
  }
}
