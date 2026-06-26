import { Directive, HostListener, Input } from '@angular/core';

export type InputFilterMode = 'digits-only' | 'positive-decimal' | 'letters-only' | 'phone' | 'alphanumeric' | 'safe-text';

/**
 * Filtra i caratteri digitati e incollati in un input in base al tipo atteso.
 * Uso: <input appInputFilter="digits-only" />
 */
@Directive({
  selector: '[appInputFilter]',
  standalone: true,
})
export class InputFilterDirective {
  @Input() appInputFilter: InputFilterMode = 'safe-text';

  private readonly ALLOWED: Record<InputFilterMode, RegExp> = {
    'digits-only':      /^\d$/,
    'positive-decimal': /^[\d.]$/,   // comma excluded: type="number" uses dot
    'letters-only':     /^[a-zA-ZÀ-ÿ\s'''\-]$/,
    'phone':            /^[\d\s+\-().]$/,
    'alphanumeric':     /^[a-zA-Z0-9]$/,
    'safe-text':        /^[^<>]$/,
  };

  private readonly CTRL_KEYS = new Set([
    'Backspace','Delete','Tab','Escape','Enter',
    'ArrowLeft','ArrowRight','ArrowUp','ArrowDown',
    'Home','End',
    'F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12',
  ]);

  @HostListener('keydown', ['$event'])
  onKeyDown(e: KeyboardEvent): void {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (this.CTRL_KEYS.has(e.key)) return;
    const allowed = this.ALLOWED[this.appInputFilter];
    if (!allowed.test(e.key)) {
      e.preventDefault();
      return;
    }
    // positive-decimal: allow only one '.'
    if (this.appInputFilter === 'positive-decimal' && e.key === '.') {
      if ((e.target as HTMLInputElement).value.includes('.')) {
        e.preventDefault();
      }
    }
  }

  @HostListener('paste', ['$event'])
  onPaste(e: ClipboardEvent): void {
    const raw = e.clipboardData?.getData('text') ?? '';
    const cleaned = this.clean(raw);
    if (cleaned === raw) return;
    e.preventDefault();
    const target = e.target as HTMLInputElement;
    const start = target.selectionStart ?? 0;
    const end   = target.selectionEnd   ?? 0;
    target.value = target.value.slice(0, start) + cleaned + target.value.slice(end);
    target.setSelectionRange(start + cleaned.length, start + cleaned.length);
    target.dispatchEvent(new Event('input'));
  }

  private clean(text: string): string {
    if (this.appInputFilter === 'positive-decimal') {
      const s = text.replace(/[^\d.]/g, '');
      const di = s.indexOf('.');
      return di === -1 ? s : s.substring(0, di + 1) + s.substring(di + 1).replace(/\./g, '');
    }
    const allowed = this.ALLOWED[this.appInputFilter];
    return text.split('').filter(c => allowed.test(c)).join('');
  }
}
