import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { EuroPipe } from '../../pipes/euro.pipe';

type CardColor = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

const COLOR_HEX: Record<CardColor, string> = {
  primary: '#2D6A4F',
  success: '#2E7D32',
  warning: '#E65100',
  danger:  '#C62828',
  neutral: '#6B7280',
};

@Component({
  selector: 'agos-stat-card',
  standalone: true,
  imports: [MatIconModule, EuroPipe],
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

  get hexColor(): string {
    return COLOR_HEX[this.color];
  }

  get iconBg(): string {
    return this.hexToRgba(this.hexColor, 0.15);
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

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}
