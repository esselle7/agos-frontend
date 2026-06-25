import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

type CardColor = 'primary' | 'success' | 'warning' | 'danger' | 'neutral' | 'info' | 'accent';

// Mappa il colore logico su un token CSS: così la card si adatta a chiaro/scuro
// senza colori hardcoded (i token cambiano valore sotto html[data-theme="dark"]).
const COLOR_VAR: Record<CardColor, string> = {
  primary: 'var(--primary)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger:  'var(--danger)',
  neutral: 'var(--text-sub)',
  info:    'var(--info)',
  accent:  'var(--accent)',
};

@Component({
  selector: 'agos-stat-card',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './stat-card.component.html',
  styleUrls: ['./stat-card.component.scss'],
})
export class StatCardComponent {
  @Input() label!: string;
  @Input() value: number | null = null;
  @Input() delta: number | null = null;
  @Input() deltaLabel?: string;
  @Input() icon?: string;
  @Input() color: CardColor = 'primary';
  @Input() loading = false;
  @Input() format: 'euro' | 'number' | 'percent' = 'euro';
  @Input() deltaPositiveIsGood = true;

  /** Token CSS del colore (si adatta a tema chiaro/scuro). */
  get colorVar(): string {
    return COLOR_VAR[this.color];
  }

  get iconBg(): string {
    return `color-mix(in srgb, ${this.colorVar} 15%, transparent)`;
  }

  /** Sfondo card: soft fade del colore in alto → colore della card (chiaro o scuro). */
  get cardBg(): string {
    return `linear-gradient(180deg, color-mix(in srgb, ${this.colorVar} 9%, var(--card)) 0%, var(--card) 58%)`;
  }

  get deltaIsPositive(): boolean {
    return this.delta !== null && this.delta > 0;
  }

  get deltaIsGood(): boolean {
    if (this.delta === null || this.delta === 0) return false;
    return this.deltaPositiveIsGood ? this.delta > 0 : this.delta < 0;
  }

  get deltaIsNeutral(): boolean {
    return this.delta === null || this.delta === 0;
  }

  formatValue(v: number | null): string {
    if (v === null) return '—';
    if (this.format === 'euro') {
      return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(v);
    }
    if (this.format === 'percent') {
      return `${v.toFixed(1)}%`;
    }
    return new Intl.NumberFormat('it-IT').format(v);
  }

  formatDelta(v: number | null): string {
    if (v === null) return '';
    const abs = Math.abs(v);
    if (this.format === 'euro') {
      return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(abs);
    }
    if (this.format === 'percent') return `${abs.toFixed(1)}%`;
    return new Intl.NumberFormat('it-IT').format(abs);
  }
}
