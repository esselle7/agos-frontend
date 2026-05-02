import {
  Component,
  signal,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { EventiListComponent } from './eventi-list.component';
import { EventiCalendarioComponent } from './eventi-calendario.component';

@Component({
  selector: 'app-eventi',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    EventiListComponent,
    EventiCalendarioComponent,
  ],
  templateUrl: './eventi.component.html',
  styleUrls: ['./eventi.component.scss'],
})
export class EventiComponent {
  private readonly dialog = inject(MatDialog);

  readonly refreshTrigger = signal(0);

  openNuovoEvento(): void {
    import('./evento-form-dialog.component').then(m => {
      this.dialog
        .open(m.EventoFormDialogComponent, {
          width: '700px',
          maxHeight: '90vh',
          data: {},
        })
        .afterClosed()
        .subscribe(created => {
          if (created) this.refreshTrigger.update(n => n + 1);
        });
    });
  }
}
