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
import { InputFilterDirective } from '../../../shared/directives/input-filter.directive';
import { AppValidators } from '../../../shared/validators/app-validators';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CategorieService } from '../../../core/services/categorie.service';
import { BuService } from '../../../core/services/bu.service';
import { CategoriaNode, CreateCategoriaRequest } from '../../../core/models/anagrafica.models';
import { SkeletonLoaderComponent } from '../../../shared/components/skeleton-loader/skeleton-loader.component';

export interface CategoriaFormDialogData {
  buId: number;
  tipo: 'ENTRATA' | 'USCITA';
  parentId?: number;
  categoriaId?: number;
  parentNome?: string;
}

@Component({
  selector: 'app-categoria-form-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    SkeletonLoaderComponent,
    InputFilterDirective,
  ],
  templateUrl: './categoria-form-dialog.component.html',
})
export class CategoriaFormDialogComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<CategoriaFormDialogComponent>);
  readonly data: CategoriaFormDialogData = inject(MAT_DIALOG_DATA);
  private readonly categorieService = inject(CategorieService);
  private readonly buService = inject(BuService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly isEdit = signal(false);
  readonly loadingForm = signal(false);
  readonly saving = signal(false);
  buNome = signal('');

  readonly form = new FormGroup({
    nome:        new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100), AppValidators.safeText()] }),
    ordinamento: new FormControl<number>(0, { nonNullable: true, validators: [Validators.min(0)] }),
  });

  ngOnInit(): void {
    this.buService.getAll().subscribe(units => {
      const bu = units.find(u => u.id === this.data.buId);
      this.buNome.set(bu?.nome ?? `BU#${this.data.buId}`);
      this.cdr.markForCheck();
    });

    if (this.data.categoriaId) {
      this.isEdit.set(true);
      this.loadingForm.set(true);
      this.categorieService.getAlbero(this.data.buId, this.data.tipo).subscribe({
        next: nodes => {
          const found = this.findNode(nodes, this.data.categoriaId!);
          if (found) {
            this.form.patchValue({ nome: found.nome, ordinamento: found.ordinamento });
          }
          this.loadingForm.set(false);
          this.cdr.markForCheck();
        },
        error: () => {
          this.loadingForm.set(false);
          this.cdr.markForCheck();
        },
      });
    }
  }

  private findNode(nodes: CategoriaNode[], id: number): CategoriaNode | null {
    for (const n of nodes) {
      if (n.id === id) return n;
      const found = this.findNode(n.sottocategorie, id);
      if (found) return found;
    }
    return null;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const v = this.form.getRawValue();
    const body: CreateCategoriaRequest = {
      nome:        v.nome,
      tipo:        this.data.tipo,
      parentId:    this.data.parentId ?? null,
      buId:        this.data.buId,
      ordinamento: v.ordinamento,
    };

    const req$ = this.isEdit()
      ? this.categorieService.update(this.data.categoriaId!, body)
      : this.categorieService.create(body);

    req$.subscribe({
      next: () => {
        this.saving.set(false);
        const msg = this.isEdit() ? 'Categoria aggiornata' : 'Categoria creata';
        this.snackBar.open(msg, 'OK', { duration: 3000 });
        this.dialogRef.close(true);
      },
      error: () => {
        this.saving.set(false);
        this.snackBar.open('Errore durante il salvataggio', 'OK', { duration: 3000 });
        this.cdr.markForCheck();
      },
    });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
