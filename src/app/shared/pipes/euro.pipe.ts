import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'euro', standalone: true })
export class EuroPipe implements PipeTransform {
  private readonly fmt = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' });

  transform(value: number | null | undefined): string {
    if (value === null || value === undefined) return '—';
    return this.fmt.format(value);
  }
}
