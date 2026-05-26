import { Directive, HostListener } from '@angular/core';

/**
 * Applicata automaticamente a tutti gli input Material datepicker.
 * - Blocca i tasti non numerici (solo cifre, / e tasti di controllo)
 * - Auto-inserisce le barre al formato DD/MM/YYYY mentre si digita
 */
@Directive({
  selector: 'input[matDatepicker], input[matStartDate], input[matEndDate]',
  standalone: true,
})
export class DateMaskDirective {
  private formatting = false;

  private readonly CTRL_KEYS = new Set([
    'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
    'Home', 'End',
  ]);

  @HostListener('keydown', ['$event'])
  onKeyDown(e: KeyboardEvent): void {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (this.CTRL_KEYS.has(e.key)) return;
    if (/^\d$/.test(e.key)) return;
    e.preventDefault();
  }

  @HostListener('input', ['$event'])
  onInput(e: Event): void {
    if (this.formatting) return;

    // Non riformattare durante cancellazioni (backspace/delete)
    const inputType = (e as InputEvent).inputType ?? '';
    if (inputType.startsWith('delete')) return;

    this.formatting = true;
    const input = e.target as HTMLInputElement;

    // Estrai solo le cifre (max 8: DDMMYYYY)
    const digits = input.value.replace(/\D/g, '').substring(0, 8);

    // Ricostituisci DD/MM/YYYY inserendo le barre progressivamente
    let formatted = '';
    if (digits.length > 0) formatted = digits.substring(0, Math.min(2, digits.length));
    if (digits.length > 2) formatted += '/' + digits.substring(2, Math.min(4, digits.length));
    if (digits.length > 4) formatted += '/' + digits.substring(4, 8);

    if (input.value !== formatted) {
      input.value = formatted;
      input.setSelectionRange(formatted.length, formatted.length);
      // Notifica Angular Material e il form control del nuovo valore
      input.dispatchEvent(new Event('input'));
    }

    this.formatting = false;
  }
}
