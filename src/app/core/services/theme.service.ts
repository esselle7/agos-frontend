import { Injectable, signal, effect } from '@angular/core';
import { Chart } from 'chart.js';

export type ThemeMode = 'light' | 'dark';

const THEME_KEY = 'agos_theme';

/**
 * Gestisce il tema chiaro/scuro.
 *
 * - Scrive l'attributo `data-theme` su <html>: i token CSS e il tema Material
 *   scuro sono scoping su `html[data-theme="dark"]`, quindi cambia tutto (anche
 *   gli overlay CDK che montano dentro <body>) ridefinendo solo i token.
 * - Persiste la scelta in localStorage; al primo avvio segue `prefers-color-scheme`.
 * - Allinea i default di Chart.js (testo assi/legenda + griglia) e ridisegna i
 *   grafici già presenti, perché Chart.js non legge le CSS custom properties.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<ThemeMode>(this.initialTheme());

  constructor() {
    // applica e persiste a ogni cambio (ed esegue subito al bootstrap)
    effect(() => {
      const mode = this.theme();
      document.documentElement.setAttribute('data-theme', mode);
      try {
        localStorage.setItem(THEME_KEY, mode);
      } catch {
        /* storage non disponibile: nessun problema, resta in memoria */
      }
      this.applyChartTheme(mode);
    });
  }

  toggle(): void {
    this.theme.update(t => (t === 'dark' ? 'light' : 'dark'));
  }

  set(mode: ThemeMode): void {
    this.theme.set(mode);
  }

  isDark(): boolean {
    return this.theme() === 'dark';
  }

  private initialTheme(): ThemeMode {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(THEME_KEY);
    } catch {
      stored = null;
    }
    if (stored === 'light' || stored === 'dark') return stored;

    const prefersDark =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }

  /** Allinea i colori "di sistema" di Chart.js al tema e ridisegna i grafici vivi. */
  private applyChartTheme(mode: ThemeMode): void {
    const isDark = mode === 'dark';
    Chart.defaults.color = isDark ? '#9FACA4' : '#66726C';
    Chart.defaults.borderColor = isDark
      ? 'rgba(255, 255, 255, 0.10)'
      : 'rgba(0, 0, 0, 0.08)';

    // Ridisegna le istanze già montate (le nuove erediteranno i default qui sopra).
    try {
      const instances = (Chart as unknown as { instances?: Record<string, Chart> })
        .instances;
      if (instances) {
        Object.values(instances).forEach(c => c?.update());
      }
    } catch {
      /* niente da aggiornare */
    }
  }
}
