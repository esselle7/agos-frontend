import { Injectable, signal } from '@angular/core';
import { DashboardPeriod } from '../models/dashboard.models';

@Injectable({ providedIn: 'root' })
export class GlobalPeriodService {
  readonly period = signal<DashboardPeriod>('MTD');
  readonly from = signal<string | null>(null);
  readonly to = signal<string | null>(null);

  setPeriod(period: DashboardPeriod, from?: string, to?: string): void {
    this.period.set(period);
    this.from.set(from ?? null);
    this.to.set(to ?? null);
  }
}
