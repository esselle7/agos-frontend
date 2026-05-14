import {
  Component,
  Input,
  Output,
  EventEmitter,
  TemplateRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { EuroPipe } from '../../pipes/euro.pipe';
import { BadgeComponent } from '../badge/badge.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { SkeletonLoaderComponent } from '../skeleton-loader/skeleton-loader.component';

export interface ColumnDef {
  key: string;
  label: string;
  type?: 'text' | 'euro' | 'date' | 'badge' | 'template';
  sortable?: boolean;
  width?: string;
  template?: TemplateRef<unknown>;
  badgeColorFn?: (row: unknown) => string;
}

@Component({
  selector: 'agos-data-table',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    MatTableModule,
    MatPaginatorModule,
    EuroPipe,
    BadgeComponent,
    EmptyStateComponent,
    SkeletonLoaderComponent,
  ],
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataTableComponent {
  @Input() columns: ColumnDef[] = [];
  @Input() data: unknown[] = [];
  @Input() loading = false;
  @Input() totalElements = 0;
  @Input() page = 0;
  @Input() size = 20;
  @Input() emptyIcon = 'list_alt';
  @Input() emptyTitle = 'Nessun elemento';
  @Output() pageChange = new EventEmitter<{ page: number; size: number }>();
  @Output() rowClick = new EventEmitter<unknown>();

  get displayedColumns(): string[] {
    return this.columns.map(c => c.key);
  }

  getCell(row: unknown, key: string): unknown {
    return (row as Record<string, unknown>)[key];
  }

  getCellString(row: unknown, key: string): string {
    const v = this.getCell(row, key);
    return v !== null && v !== undefined ? String(v) : '—';
  }

  getCellNumber(row: unknown, key: string): number | null {
    const v = this.getCell(row, key);
    return typeof v === 'number' ? v : null;
  }

  formatDate(value: unknown): string {
    if (!value || typeof value !== 'string') return '—';
    const parts = value.split('-');
    if (parts.length !== 3) return value;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  getBadgeColor(col: ColumnDef, row: unknown): string {
    return col.badgeColorFn ? col.badgeColorFn(row) : '#6B7280';
  }

  onPage(event: PageEvent): void {
    this.pageChange.emit({ page: event.pageIndex, size: event.pageSize });
  }
}
