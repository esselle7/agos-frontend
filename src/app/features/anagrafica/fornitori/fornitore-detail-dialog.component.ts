import {
  Component,
  OnInit,
  inject,
  signal,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import {
  ReactiveFormsModule,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { FornitoriService } from '../../../core/services/fornitori.service';
import { BuService } from '../../../core/services/bu.service';
import { FornitoreDTO, AliasDTO } from '../../../core/models/anagrafica.models';
import { BusinessUnitDTO } from '../../../core/models/anagrafica.models';
import { BadgeComponent } from '../../../shared/components/badge/badge.component';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

export interface FornitoreDetailDialogData {
  fornitoreId: string;
}

@Component({
  selector: 'app-fornitore-detail-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    BadgeComponent,
    SkeletonLoaderComponent,
  ],
  templateUrl: './fornitore-detail-dialog.component.html',
})
export class FornitoreDetailDialogComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<FornitoreDetailDialogComponent>);
  private readonly data: FornitoreDetailDialogData = inject(MAT_DIALOG_DATA);
  private readonly fornitoriService = inject(FornitoriService);
  private readonly buService = inject(BuService);
  private readonly confirmDialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly cdr = inject(ChangeDetectorRef);

  fornitore = signal<FornitoreDTO | null>(null);
  loading = signal(true);
  addingAlias = signal(false);
  savingAlias = signal(false);
  buMap = signal<Map<number, BusinessUnitDTO>>(new Map());

  readonly aliasForm = new FormGroup({
    pattern:   new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    matchType: new FormControl<'EXACT' | 'CONTAINS' | 'REGEX'>('CONTAINS', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.buService.getAll().subscribe(units => {
      this.buMap.set(new Map(units.map(u => [u.id, u])));
      this.cdr.markForCheck();
    });
    this.loadFornitore();
  }

  loadFornitore(): void {
    this.loading.set(true);
    this.fornitoriService.getById(this.data.fornitoreId).subscribe({
      next: f => {
        this.fornitore.set(f);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Errore nel caricamento del fornitore', 'OK', { duration: 3000 });
        this.cdr.markForCheck();
      },
    });
  }

  toggleAddAlias(): void {
    this.addingAlias.update(v => !v);
    if (!this.addingAlias()) {
      this.aliasForm.reset({ pattern: '', matchType: 'CONTAINS' });
    }
  }

  submitAlias(): void {
    if (this.aliasForm.invalid) {
      this.aliasForm.markAllAsTouched();
      return;
    }
    this.savingAlias.set(true);
    const v = this.aliasForm.getRawValue();
    this.fornitoriService.addAlias(this.data.fornitoreId, { pattern: v.pattern, matchType: v.matchType }).subscribe({
      next: () => {
        this.savingAlias.set(false);
        this.addingAlias.set(false);
        this.aliasForm.reset({ pattern: '', matchType: 'CONTAINS' });
        this.snackBar.open('Alias aggiunto', 'OK', { duration: 3000 });
        this.loadFornitore();
        this.cdr.markForCheck();
      },
      error: () => {
        this.savingAlias.set(false);
        this.snackBar.open('Errore nell\'aggiunta dell\'alias', 'OK', { duration: 3000 });
        this.cdr.markForCheck();
      },
    });
  }

  deleteAlias(alias: AliasDTO): void {
    this.confirmDialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Elimina alias',
        message: `Eliminare il pattern "${alias.pattern}"?`,
        confirmLabel: 'Elimina',
        danger: true,
      },
    }).afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.fornitoriService.deleteAlias(this.data.fornitoreId, alias.id).subscribe({
        next: () => {
          this.snackBar.open('Alias eliminato', 'OK', { duration: 3000 });
          this.loadFornitore();
        },
        error: () => this.snackBar.open('Errore durante l\'eliminazione', 'OK', { duration: 3000 }),
      });
    });
  }

  aliasColor(matchType: string): string {
    const map: Record<string, string> = {
      EXACT:    '#2C6E8F',
      CONTAINS: '#2E7D32',
      REGEX:    '#6A1B9A',
    };
    return map[matchType] ?? '#6B7280';
  }

  buNome(id: number | null): string {
    if (id == null) return '—';
    return this.buMap().get(id)?.nome ?? `BU#${id}`;
  }

  buColore(id: number | null): string {
    if (id == null) return '#6B7280';
    return this.buMap().get(id)?.colore ?? '#6B7280';
  }

  close(): void {
    this.dialogRef.close();
  }
}
