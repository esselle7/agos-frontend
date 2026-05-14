import {
  Component,
  OnInit,
  signal,
  inject,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTreeModule, MatTreeNestedDataSource } from '@angular/material/tree';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { NestedTreeControl } from '@angular/cdk/tree';
import { CategorieService } from '../../../core/services/categorie.service';
import { BuService } from '../../../core/services/bu.service';
import { CacheService } from '../../../core/services/cache.service';
import { CategoriaNode } from '../../../core/models/anagrafica.models';
import { BusinessUnitDTO } from '../../../core/models/anagrafica.models';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader.component';
import { BuSelectorComponent } from '../../../shared/components/bu-selector/bu-selector.component';

export interface CategoriaFormDialogData {
  buId: number;
  tipo: 'ENTRATA' | 'USCITA';
  parentId?: number;
  categoriaId?: number;
  parentNome?: string;
}

@Component({
  selector: 'app-categorie',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatTooltipModule,
    MatTreeModule,
    MatProgressSpinnerModule,
    EmptyStateComponent,
    SkeletonLoaderComponent,
    BuSelectorComponent,
  ],
  templateUrl: './categorie.component.html',
  styleUrls: ['./categorie.component.scss'],
})
export class CategorieComponent implements OnInit {
  private readonly categorieService = inject(CategorieService);
  private readonly buService = inject(BuService);
  private readonly cacheService = inject(CacheService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly cdr = inject(ChangeDetectorRef);

  loading = signal(false);
  selectedBuId = signal<number | null>(null);
  selectedTipo = signal<'ENTRATA' | 'USCITA'>('ENTRATA');
  buList = signal<BusinessUnitDTO[]>([]);

  readonly buControl = new FormControl<number | null>(null);

  readonly treeControl = new NestedTreeControl<CategoriaNode>(node => node.sottocategorie);
  readonly dataSource = new MatTreeNestedDataSource<CategoriaNode>();

  hasChildren = (_: number, node: CategoriaNode) => node.sottocategorie?.length > 0;

  ngOnInit(): void {
    this.buService.getAll().subscribe(units => {
      this.buList.set(units);
      if (units.length > 0) {
        const firstId = units[0].id;
        this.selectedBuId.set(firstId);
        this.buControl.setValue(firstId, { emitEvent: false });
        this.loadTree();
      }
      this.cdr.markForCheck();
    });

    this.buControl.valueChanges.subscribe(buId => {
      this.selectedBuId.set(buId);
      this.loadTree();
    });
  }

  selectTipo(tipo: 'ENTRATA' | 'USCITA'): void {
    this.selectedTipo.set(tipo);
    this.loadTree();
  }

  loadTree(): void {
    const buId = this.selectedBuId();
    if (buId == null) return;
    this.loading.set(true);
    this.categorieService.getAlbero(buId, this.selectedTipo()).subscribe({
      next: nodes => {
        this.dataSource.data = nodes;
        this.treeControl.dataNodes = nodes;
        this.treeControl.expandAll();
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Errore nel caricamento categorie', 'OK', { duration: 3000 });
        this.cdr.markForCheck();
      },
    });
  }

  openCreate(): void {
    const buId = this.selectedBuId();
    if (buId == null) return;
    this.openFormDialog({ buId, tipo: this.selectedTipo() });
  }

  openSubcategoria(node: CategoriaNode): void {
    const buId = this.selectedBuId();
    if (buId == null) return;
    this.openFormDialog({ buId, tipo: this.selectedTipo(), parentId: node.id, parentNome: node.nome });
  }

  openEdit(node: CategoriaNode): void {
    const buId = this.selectedBuId();
    if (buId == null) return;
    this.openFormDialog({ buId, tipo: this.selectedTipo(), categoriaId: node.id });
  }

  private openFormDialog(data: CategoriaFormDialogData): void {
    import('./categoria-form-dialog.component').then(m => {
      this.dialog.open(m.CategoriaFormDialogComponent, {
        width: '480px',
        data,
      }).afterClosed().subscribe(saved => {
        if (saved) {
          const buId = this.selectedBuId();
          if (buId != null) {
            this.cacheService.invalidatePattern(`categorie:${buId}:`);
          }
          this.loadTree();
        }
      });
    });
  }

  tipoColor(tipo: 'ENTRATA' | 'USCITA'): string {
    return tipo === 'ENTRATA' ? '#2E7D32' : '#C62828';
  }
}
