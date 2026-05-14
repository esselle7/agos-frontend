import { Pipe, PipeTransform, inject } from '@angular/core';
import { BuService } from '../../core/services/bu.service';

@Pipe({ name: 'buLabel', standalone: true, pure: false })
export class BuLabelPipe implements PipeTransform {
  private readonly buService = inject(BuService);
  private readonly resolved = new Map<number, string>();

  transform(buId: number | null | undefined): string {
    if (buId == null) return '—';
    if (this.resolved.has(buId)) return this.resolved.get(buId)!;

    this.buService.getAll().subscribe(units => {
      const bu = units.find(u => u.id === buId);
      this.resolved.set(buId, bu?.nome ?? `BU #${buId}`);
    });

    return this.resolved.get(buId) ?? '…';
  }
}
