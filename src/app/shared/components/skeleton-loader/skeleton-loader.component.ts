import { Component, Input } from '@angular/core';

@Component({
  selector: 'agos-skeleton-loader',
  standalone: true,
  templateUrl: './skeleton-loader.component.html',
  styleUrls: ['./skeleton-loader.component.scss'],
})
export class SkeletonLoaderComponent {
  @Input() type: 'card' | 'table' | 'stat' | 'text' = 'text';
  @Input() rows = 3;

  get rowArray(): number[] {
    return Array.from({ length: this.rows }, (_, i) => i);
  }

  widthForRow(i: number): string {
    const widths = ['100%', '80%', '60%', '90%', '70%'];
    return widths[i % widths.length];
  }

  cellWidths = ['40%', '25%', '20%', '15%'];
}
