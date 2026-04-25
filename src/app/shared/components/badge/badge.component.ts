import { Component, Input } from '@angular/core';

@Component({
  selector: 'agos-badge',
  standalone: true,
  templateUrl: './badge.component.html',
  styleUrls: ['./badge.component.scss'],
})
export class BadgeComponent {
  @Input() color!: string;
  @Input() text!: string;
  @Input() size: 'sm' | 'md' = 'md';
  @Input() pill = true;

  get bgColor(): string {
    if (!this.color) return 'rgba(107,114,128,0.2)';
    if (this.color.startsWith('#')) return this.hexToRgba(this.color, 0.2);
    return this.color;
  }

  private hexToRgba(hex: string, alpha: number): string {
    const clean = hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex;
    const r = parseInt(clean.slice(1, 3), 16);
    const g = parseInt(clean.slice(3, 5), 16);
    const b = parseInt(clean.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}
